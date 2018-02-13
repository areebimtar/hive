import _ from 'lodash';
import Etsy from '../../../../shared/modules/etsy';
import { WORKER } from '../../../../shared/constants';
import { FIELDS, NON_PRODUCT_FIELDS_TAGS } from '../../../../shared/modules/etsy/constants';

async function uploadProductFieldsToEtsy(config, models, logger, product, modifiedFields, shop, accountProperties, requests, rateLimiter) {
  const etsy = new Etsy(config, rateLimiter, logger);

  // FIXME: FIELDS.SECTION_ID is internal id into section table that needs to be translated into real section
  if (modifiedFields.indexOf(FIELDS.SECTION_ID) !== -1) {
    const ourSectionId = product[FIELDS.SECTION_ID];

    if (ourSectionId) {
      const section = await models.sections.getSection(shop.id, ourSectionId);
      product[FIELDS.SHOP_SECTION_ID] = section.section_id;
    } else {
      product[FIELDS.SHOP_SECTION_ID] = null;
    }
  }

  return etsy.uploadProduct(accountProperties, shop.id, product, modifiedFields, requests);
}

async function removedProductFieldsChangedProperties(models, product) {
  const changedProperties = _.get(product, FIELDS.CHANGED_PROPERTIES, []);
  const updatedChangedProperties = _.filter(changedProperties, tag => NON_PRODUCT_FIELDS_TAGS.indexOf(tag) !== -1);
  await models.products.update({ id: product.id, [FIELDS.CHANGED_PROPERTIES]: updatedChangedProperties });
}

export async function start(config, models, logger, data, taskId, manager, requests, rateLimiter) {
  const productId = parseInt(data, 10);
  const [product, shop, account ] = await models.compositeRequests.getProductShopAccountByProductId(productId);
  const modifiedFields = _.get(product, FIELDS.CHANGED_PROPERTIES, []);
  if (modifiedFields.length > 0) {
    await uploadProductFieldsToEtsy(config, models, logger, product, modifiedFields, shop, account, requests, rateLimiter);
    await removedProductFieldsChangedProperties(models, product);
  }
  return { result: WORKER.TASK_RESULTS.SUCCEEDED };
}
