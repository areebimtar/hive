import Promise from 'bluebird';
import _ from 'lodash';
import moment from 'moment';

import etsyUploadProduct from './etsy/uploadProduct';
import { WORKER } from '../../../shared/constants';
import { FIELDS } from '../../../shared/modules/etsy/constants'; // TODO: Remove this when babel6 issues will be fixed


const channels = {
  etsy: etsyUploadProduct
};

function setProductModified(models, productId, modifiedState) {
  return models.products.update({ [FIELDS.ID]: productId, [FIELDS.MODIFIED_BY_HIVE]: modifiedState });
}

function setProductSyncTime(models, productId, syncTime) {
  return models.products.update({ [FIELDS.ID]: productId, [FIELDS.MODIFIED_BY_HIVE]: false, [FIELDS.LAST_SYNC]: syncTime });
}

async function doTheJob(config, models, logger, data, taskId, manager, suspensionPoint) {
  if (!data || (!_.isString(data) && !_.isNumber(data))) { return Promise.reject(new TypeError(`Invalid product id: ${data}`)); }

  const productId = parseInt(data, 10);
  const [product, shop, account, channel] = await models.compositeRequests.getProductShopAccountChannelByProductId(productId);
  const channelName = channel.name.toLowerCase();
  if (!channels[channelName]) { throw new Error(`Unknown channel: #${channel.id} (${channel.name})`); }
  const upload = channels[channelName];

  // now see if the product is marked as invalid (meaning we know we cannot upload it at all)
  // if so we return success so that we won't retry until the user modifies the product again
  if (product[FIELDS.IS_INVALID] === 'true') {
    return { result: WORKER.TASK_RESULTS.SUCCEEDED };
  }

  try {
    const channelUploadResult = await upload(config, models, logger, manager,  suspensionPoint, product, account.company_id, channel.id, taskId);
    if (_.get(channelUploadResult, 'result') === WORKER.TASK_RESULTS.SUCCEEDED) {
      await setProductSyncTime(models, product.id, moment().unix());
      logger.debug(`Product ${product.id} has been successfully uploaded, increment shop sync counter`);
      await models.shops.uploadProductFinished(shop.id); // Record only on success
      await setProductModified(models, product.id, false);
    }
    return channelUploadResult;
  } catch (e) {
    logger.debug(`Product ${product.id} upload has failed, restore modified flag`);
    throw e;
  }
}

export function start(config, models, logger, data, taskId, manager) {
  logger.info('uploadProduct');
  return doTheJob(config, models, logger, data, taskId, manager);
}

export async function resume(config, models, logger, data, suspensionPoint, wasModified, taskId, manager) {
  logger.info(`resume uploadProduct ${data} ${suspensionPoint} ${wasModified}`);

  const subtaskResults = await manager.getSubtaskResults(taskId); // get result of subtasks
  const failedSubtasks = _.filter(subtaskResults, {result: false}); // find failed subtasks
  if (failedSubtasks.length !== 0) {
    throw new Error(`${failedSubtasks.length} subtask(s) has failed`);
  }
  await manager.dropAllCompletedChildren(taskId);
  return doTheJob(config, models, logger, data, taskId, manager, suspensionPoint);
}
