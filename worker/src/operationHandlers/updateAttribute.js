import _ from 'lodash';
import Promise from 'bluebird';
// import logger from 'app/logger'; // TODO: Uncomment this when babel6 issue will be solved
import etsyUpdateAttribute from './etsy/updateAttribute';

const channels = {
  etsy: etsyUpdateAttribute
};

export function start(config, models, logger, data, unusedTaskId, unusedManager, requests, rateLimiter) {
  logger.info(`updateAttribute ${data}`);
  if (!data || (!_.isString(data) && !_.isNumber(data))) { return Promise.reject(new TypeError(`Invalid attribute id: ${data}`)); }

  const attributeId = parseInt(data, 10);

  return models.attributes.getById(attributeId)
    .then((attribute) => {
      const productId = parseInt(attribute.product_id, 10);
      return models.products.getById(productId)
        .then((product) => {
          if (!product) { throw new Error('There is no product for attribute'); } // Done

          return models.compositeRequests.getShopAccountChannelByShopId(product.shop_id)
            .then( ([shop, account, channel]) => {
              const channelName = channel.name.toLowerCase();
              if (!channels[channelName]) { throw new Error(`Unknown channel: #${channel.id} (${channel.name})`); }
              const upload = channels[channelName];
              return upload(config, attribute, product, shop, account, requests, rateLimiter);
            })
            .then(() => {
              logger.debug('Attribute has been uploaded to channel');
              return models.attributes.upsertAttribute(productId, _.merge(attribute, { modified: false, deleted: false }));
            })
            .then(() => {
              logger.debug('Attribute has been set as not modified in database');
              return { result: 'succeeded' };
            });
        });
    });
}
