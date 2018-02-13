import _ from 'lodash';
import Promise from 'bluebird';
// import logger from 'app/logger'; // TODO: Uncomment this when babel6 issue will be solved
import etsyDeleteAttribute from './etsy/deleteAttribute';

const channels = {
  etsy: etsyDeleteAttribute
};

export function start(config, models, logger, data, unusedTaskId, unusedManager, requests, rateLimiter) {
  logger.info(`deleteAttribute ${data}`);
  if (!data || (!_.isString(data) && !_.isNumber(data))) { return Promise.reject(new TypeError(`Invalid attribute id: ${data}`)); }

  const attributeId = parseInt(data, 10);

  return models.attributes.getById(attributeId)
    .then((attribute) => {
      const productId = parseInt(attribute.product_id, 10);
      return models.products.getByIds([productId])
        .then((products) => {
          if (products.length === 0) { throw new Error('There is no product for attribute'); } // Done
          if (products.length > 1) { throw new Error('Too many products returned.'); }

          return products[0];
        })
        .then((product) => {
          return models.compositeRequests.getShopAccountChannelByShopId(product.shop_id)
            .then( ([shop, account, channel]) => {
              const channelName = channel.name.toLowerCase();
              if (!channels[channelName]) { throw new Error(`Unknown channel: #${channel.id} (${channel.name})`); }
              const delete_ = channels[channelName];
              return delete_(config, attribute, product, shop, account, requests, rateLimiter);
            })
            .then(() => {
              logger.debug('Attribute has been deleted from channel');
              return models.attributes.deleteById(attributeId, false);
            })
            .then(() => {
              logger.debug('Attribute has been deleted from database');
              return { result: 'succeeded' };
            });
        });
    });
}
