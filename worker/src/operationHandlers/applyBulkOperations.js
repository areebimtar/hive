import _ from 'lodash';
import etsyApplyBulkOperations from './etsy/applyBulkOperations';
import { SHOP_SYNC_STATUS_SYNC, SHOP_SYNC_STATUS_INITIAL_SYNC } from 'global/db/models/constants';
import { WORKER } from 'global/constants';

const channels = {
  etsy: etsyApplyBulkOperations
};

export default async function(config, models, logger, data, rabbitClient) {
  const IN_SYNC_STATUSES = [SHOP_SYNC_STATUS_SYNC, SHOP_SYNC_STATUS_INITIAL_SYNC];
  if (!_.isArray(data.operations) && !data.operations.length) { throw new Error(`Invalid operations: ${JSON.stringify(data.operations)}`); }
  if (!data.shopId || (!_.isString(data.shopId) && !_.isNumber(data.shopId))) { throw new TypeError(`Invalid shop id: ${data.shopId}`); }

  // prepare basic data
  const shopId = parseInt(data.shopId, 10);
  const { operations } = data;
  const [shop, account, channel] = await models.compositeRequests.getShopAccountChannelByShopId(shopId);

  if (IN_SYNC_STATUSES.indexOf(shop.sync_status) !== -1) {
    logger.info(`Sync for shop ID ${data.shopId} is in progress, we should try later`);
    return WORKER.TASK_RESULTS.BLOCKED;
  }

  logger.info(`applyBulkOperations for shop ID ${data.shopId}. # of operations ${data.operations.length}`);

  // get apply Fn
  const channelName = channel.name.toLowerCase();
  if (!channels[channelName]) { throw new Error(`Unknown channel: #${channel.id} (${channel.name})`); }
  const apply = channels[channelName];
  // apply bulk operations
  await apply(config, models, logger, shop, operations);
  // enqueue shop sync
  await rabbitClient.enqueueShopSync(account.company_id, channel.id, shop.id);

  return WORKER.TASK_RESULTS.SUCCEEDED;
}
