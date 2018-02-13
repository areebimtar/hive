import _ from 'lodash';
// import logger from 'app/logger'; // TODO: Uncomment this when babel6 issue will be solved
import etsyDownloadProduct from './etsy/downloadProduct';

import { WORKER } from '../../../shared/constants';

const channels = {
  etsy: etsyDownloadProduct
};

export async function start(config, models, logger, data, unusedTaskId, unusedManager, requests, rateLimiter) {
  logger.info('downloadProduct');
  if (!data || (!_.isString(data) && !_.isNumber(data))) { throw new TypeError(`Invalid product id: ${data}`); }

  const productId = parseInt(data, 10);

  // TODO: decide whether do we need to check shopId in getById function or should we add shopId check to getByIds
  const product = await models.products.getById(productId);

  if (!product) {
    // product was deleted because Etsy sent bad state for it.
    // abort the task, there is nothing we can do
    return { result: WORKER.TASK_RESULTS.ABORTED };
  }

  logger.debug('got product');
  logger.debug(product);

  const [shop, account, channel] = await models.compositeRequests.getShopAccountChannelByShopId(product.shop_id);

  logger.debug('got shop', shop);
  logger.debug('got account', account);
  logger.debug('got channel', channel);

  if (!channel) {
    throw new Error(`Can't find channel by ID #${account.channel_id}`);
  }
  const channelName = channel.name.toLowerCase();
  if (!channels[channelName]) { throw new Error(`Unknown channel: #${channel.id} (${channel.name})`); }
  const download = channels[channelName];

  await download(config, models, logger, product, shop, account, requests, rateLimiter);
  await models.shops.downloadProductFinished(shop.id); // record only on success
  return { result: WORKER.TASK_RESULTS.SUCCEEDED };
}
