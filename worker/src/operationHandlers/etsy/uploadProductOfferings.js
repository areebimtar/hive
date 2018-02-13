import _ from 'lodash';
import Etsy from '../../../../shared/modules/etsy';
import { WORKER } from '../../../../shared/constants';
import { FIELDS } from '../../../../shared/modules/etsy/constants';

function removeProductOfferingsFromChangedProperties(models, product) {
  const changedProperties = _.get(product, FIELDS.CHANGED_PROPERTIES, []);
  const updatedChangedProperties = _.filter(changedProperties, tag => tag !== FIELDS.PRODUCT_OFFERINGS && tag !== FIELDS.VARIATIONS);
  return models.products.update({ id: product.id, [FIELDS.CHANGED_PROPERTIES]: updatedChangedProperties });
}

export async function start(config, models, logger, data, taskId, manager, requests, rateLimiter) {
  const etsy = new Etsy(config, rateLimiter, logger);
  const productId = parseInt(data, 10);
  const [product, shop, account] = await models.compositeRequests.getProductShopAccountByProductId(productId);

  const productOfferings = await models.productOfferings.getByProductIdWithVariations(productId);
  await etsy.uploadProductOfferings(account, shop.id, product[FIELDS.LISTING_ID], product, productOfferings, requests);

  await removeProductOfferingsFromChangedProperties(models, product);

  return { result: WORKER.TASK_RESULTS.SUCCEEDED };
}
