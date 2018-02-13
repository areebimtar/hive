import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';
// import logger from 'app/logger'; // TODO: Uncomment this when babel6 issue will be solved
import etsySyncShop from './etsy/syncShop';

// import { WORKER } from 'global/constants'; // TODO: Uncomment this when babel6 issue will be solved
import { WORKER, SHOP_SYNC_RETRY_BUFFER_PERIOD} from '../../../shared/constants';
import { SHOP_SYNC_TOO_MANY_LISTINGS, SHOP_SYNC_IN_VACATION_MODE, SHOP_SYNC_UNKNOWN_ERROR } from '../../../shared/db/models/constants';

const channels = {
  etsy: etsySyncShop
};

// update timestamp to prevent rescheduling the tast immediately
function markShopUpdated(models, shop) {
  const newTimestamp = moment().subtract(SHOP_SYNC_RETRY_BUFFER_PERIOD, 'milliseconds');
  return models.shops.setLastSyncTimestamp(shop.account_id, shop.id, newTimestamp);
}

function isShopLevelError(result) {
  const statuses = [SHOP_SYNC_TOO_MANY_LISTINGS, SHOP_SYNC_UNKNOWN_ERROR];

  return statuses.indexOf(result.syncStatus) !== -1;
}

function shouldSyncShop(shop) {
  const invalid = shop.invalid && shop.sync_status !== SHOP_SYNC_IN_VACATION_MODE && shop.sync_status !== SHOP_SYNC_UNKNOWN_ERROR;
  const isApplying = shop.applying_operations;
  return !invalid && !isApplying;
}

export async function start(config, models, logger, data, taskId, manager, requests, rateLimiter, restarted) {
  logger.info(`syncShop ${data}`);
  if (!data || (!_.isString(data) && !_.isNumber(data))) { return Promise.reject(new TypeError(`Invalid product id: ${data}`)); }

  const shopId = parseInt(data, 10);
  const [shop, account, channel] = await models.compositeRequests.getShopAccountChannelByShopId(shopId);

  // first we need to check if shop is valid and is not applying changes
  if (!shouldSyncShop(shop) && !restarted) {
    const message = `skiping syncShop for shop ID ${data}. Apply operations task is in progress (or shop is invalid)`;
    logger.info(message);
    return { result: WORKER.TASK_RESULTS.SUCCEEDED, message };
  }

  await markShopUpdated(models, shop);
  await models.shops.syncStartedEtsy(shopId, 0, 0);

  const channelName = channel.name.toLowerCase();
  if (!channels[channelName]) { throw new Error(`Unknown channel: #${channel.id} (${channel.name})`); }
  const sync = channels[channelName];
  const result = await sync(config, models, logger, shop, account, manager, requests, rateLimiter, account.company_id, channel.id, taskId);

  const isAborted = result.result === WORKER.TASK_RESULTS.ABORTED;
  if (isAborted) {
    await models.shops.setShopStatus(shop.id, result.syncStatus, true);
    return result;
  }

  const isFailed = result.result !== WORKER.TASK_RESULTS.SUCCEEDED;
  let shouldSuspend = isFailed;
  if (shouldSuspend) {
    // in case we want to wait for our children, let's check with manager we really have them
    // otherwise we won't wake up
    shouldSuspend = await manager.hasWipChildren(taskId);
  }

  if (shouldSuspend) {
    logger.debug('Sync suspended by channel sync handler');
    await models.shops.syncStartedEtsy(shopId, result.uploadCount, result.downloadCount);
    return { ...result, suspensionPoint: 'restart' };
  }

  // in case of failed task which is not suspended and failure comes from shop (not its children), set sync status and mark shop as invalid
  if (isFailed && isShopLevelError(result)) {
    await models.shops.setShopAsInvalid(shop.id, result.syncStatus, result.cause);
    return result;
  }

  logger.debug('Empty product list has been retrieved');
  logger.debug('Change shop sync state');

  if (!result.deleted) {
    await models.shops.syncStartedEtsy(shopId, 0, 0);
    await models.shops.syncFinished(shopId, false);
  }
  return { result: WORKER.TASK_RESULTS.SUCCEEDED };
}

export async function resume(config, models, logger, data, suspensionPoint, wasModified, taskId, manager, requests, rateLimiter) {
  logger.debug('resume shopSync', data, suspensionPoint, wasModified);
  if (wasModified) {
    logger.debug('Task was modified, run it again');
    await manager.markTaskNotModified(taskId);
    await manager.dropAllCompletedChildren(taskId);
    return start(config, models, logger, data, taskId, manager, requests, rateLimiter, true);
  }

  const subtaskResults = await manager.getSubtaskResults(taskId);
  const failedSubtasks = _.filter(subtaskResults, {result: false});

  if (failedSubtasks.length !== 0) {
    const shopId = parseInt(data, 10);
    await models.shops.syncFinished(shopId, failedSubtasks.length > 0);

    throw new Error(`${failedSubtasks.length} subtask(s) has failed`);
  }

  logger.debug('Task should be started again');
  return start(config, models, logger, data, taskId, manager, requests, rateLimiter, true);
}
