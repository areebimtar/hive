// import Etsy from 'global/modules/etsy';
import Etsy from '../../../../shared/modules/etsy'; // TODO: Remove this when babel6 issues will be fixed

export default (config, attribute, product, shop, accountProperties, requests, rateLimiter) => {
  const etsy = new Etsy(config, rateLimiter);
  return etsy.deleteAttribute(accountProperties, shop.id, product.listing_id, attribute, requests);
};
