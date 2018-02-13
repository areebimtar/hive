import Promise from 'bluebird';
import _ from 'lodash';
import moment from 'moment';
// import Etsy from 'global/modules/etsy';
import Etsy from '../../../../shared/modules/etsy'; // TODO: Remove this when babel6 issues will be fixed
import { FIELDS } from '../../../../shared/modules/etsy/constants';
import { addProductOfferingsInventoryShops } from './downloadProductOfferings';

export default (config, models, logger, product, shop, accountProperties, requests, rateLimiter) => {
  const etsy = new Etsy(config, rateLimiter, logger);
  return etsy.getListing(accountProperties, product.listing_id, requests)
    .then(replaceProductWithVariations.bind(null, models, logger, shop, product )) // eslint-disable-line no-use-before-define
    .then(() => {
      return { hello: 'from etsy' };
    });
};

function replaceProductWithVariations(models, logger, shop, productFromDb, productFromEtsy) {
  const productId = productFromDb.id;

  function addProduct(connection) {
    logger.debug('addProduct');
    const modifiedAt = moment().unix();
    productFromEtsy[FIELDS.ID] = productId;
    productFromEtsy[FIELDS.SHOP_ID] = shop.id;
    productFromEtsy[FIELDS.LAST_SYNC] = modifiedAt;
    productFromEtsy[FIELDS.HIVE_LAST_MODIFIED_TSZ] = modifiedAt;
    return models.products.insert(productFromEtsy, connection);
  }

  function deleteProduct(connection) {
    logger.debug('delete product', productId, shop.id);
    return models.products.deleteByIds([productId], connection);
  }

  function addPhotos(connection) {
    logger.debug('addPhotos');
    if (productFromEtsy[FIELDS.IS_INVALID]) {
      productFromEtsy[FIELDS.PHOTOS] = [];
      return Promise.resolve();
    }

    return connection.tx(async (t) => {
      const imageIds = [];
      await Promise.each(productFromEtsy.photos, async etsyPhoto => {
        const image = {
          channel_image_id: etsyPhoto.channelImageId,
          fullsize_url: etsyPhoto.fullsizeUrl,
          thumbnail_url: etsyPhoto.thumbnailUrl,
          shop_id: shop.id
        };
        try {
          const dbImage = await models.images.findByEtsyImageId(shop.id, image.channel_image_id);
          if (dbImage) {
            logger.debug(`Image found in db. image id: ${dbImage.id}`);
            imageIds.push(dbImage.id);
            return;
          }
        } catch (error) {
          logger.error(`Error while finding shop id: ${shop.id}, etsy photo id: ${image.channel_image_id}`);
        }
        const imageId = await models.images.upsert(image, t);
        logger.debug(`Photo has been added, our photo id: ${imageId}, etsy photo id: ${image.channel_image_id}`);
        imageIds.push(imageId);
      });
      productFromEtsy[FIELDS.PHOTOS] = imageIds;
    }).catch((e) => {
      const errorMsg = `Unable to insert/associate image (Product id: ${productId}: ${e.message}.`;
      logger.debug(errorMsg);
      logger.debug(e);
      throw new Error(errorMsg);
    });
  }

  function mapSection(connection) {
    if (productFromEtsy[FIELDS.IS_INVALID] || !productFromEtsy.section) {
      productFromEtsy[FIELDS.SECTION_ID] = null;
      return Promise.resolve();
    }

    return models.sections.getSectionBySectionId(shop.id, productFromEtsy.section, connection)
      .then((sections) => {
        if (_.isEmpty(sections)) {
          logger.error(`Missing section id #${productFromEtsy.section}`);
          return;
        }

        const section = _.head(sections);
        logger.debug(`Section has been mapped: ${section.id}, etsy section id: ${productFromEtsy.section}`);
        productFromEtsy[FIELDS.SECTION_ID] = section.id;
      });
  }

  function addVariations(connection) {
    if (productFromEtsy[FIELDS.IS_INVALID]) { return Promise.resolve(); }
    return models.variations.addVariations(productId, productFromEtsy.variations, connection);
  }

  function addProductOfferings(connection, addVariationsResult) {
    if (productFromEtsy[FIELDS.IS_INVALID]) { return Promise.resolve(); }
    return addProductOfferingsInventoryShops(connection, models, addVariationsResult, productFromEtsy.productOfferings, productId);
  }

  function arrayToMap(array, keyPropertyName) {
    return _.reduce(array, (map, attribute) => _.set(map, _.get(attribute, keyPropertyName), attribute), {});
  }

  function getDeletedAttributeIds(ourAttributes, etsyAttributes) {
    const etsyAttributesMap = arrayToMap(etsyAttributes, 'property_id');
    return _(ourAttributes)
      .filter(attribute => !_.get(etsyAttributesMap, attribute.property_id, false))
      .map(attribute => attribute.id)
      .value();
  }

  async function updateAttributes(connection) {
    if (productFromEtsy[FIELDS.IS_INVALID]) { return Promise.resolve(); }

    const etsyAttributes = productFromEtsy.attributes;
    const ourAttributes = await models.attributes.getByProductId(productId, true);

    // delete attributes which are no longer on etsy
    const deletedAttributeIds = getDeletedAttributeIds(ourAttributes, etsyAttributes);
    if (deletedAttributeIds.lenght) {
      await models.attributes.deleteByIds(deletedAttributeIds, false, connection);
    }

    // update existing attributes and insert new ones
    const ourAttributesMap = arrayToMap(ourAttributes, 'property_id');
    const attributes = etsyAttributes
      .map(attribute => {
        // clear deleted and modified flags
        attribute.modified = false;
        attribute.deleted = false;
        // copy id (if aplicable)
        const ourAttribute = _.get(ourAttributesMap, attribute.property_id);
        if (ourAttribute && ourAttribute.id) {
          attribute.id = ourAttribute.id;
        }
        return attribute;
      })
      .map(attribute => _.mapKeys(attribute, (value, key) => _.camelCase(key)));
    await models.attributes.upsertAttributes(productId, attributes, connection);

    return true;
  }

  return models.db.tx((t) => {
    function source(index, result) {
      switch (index) {
        case 0: return deleteProduct(t).then(() => { return true; }); // continue execution
        case 1: return addPhotos(t).then(() => { return true; });
        case 2: return mapSection(t).then(() => true);
        case 3: return addProduct(t).then(() => true);
        case 4: return addVariations(t);
        case 5: return addProductOfferings(t, result);
        case 6: return updateAttributes(t);
        default:
          return undefined; // We are done
      }
    }

    return t.sequence(source).catch((e) => {
      logger.debug('Error during adding product to DB');
      logger.debug(`Step #${e.index}`);
      logger.debug(e.error);
      logger.debug(e);
      throw new Error(`Error during adding product to DB, step #${e.index}`);
    });
  });
}
