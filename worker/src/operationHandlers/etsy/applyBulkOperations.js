import _ from 'lodash';
import Promise from 'bluebird';
import moment from 'moment';
import { fromJS } from 'immutable';
import 'core-js/fn/array/includes';

import { FIELDS } from '../../../../shared/modules/etsy/constants';

import createMissingSections from './createMissingSections';

import * as bulkEditOps from '../../../../shared/modules/etsy/bulkEditOps';
import { INVENTORY_OP_TYPES, ATTRIBUTES_OP_TYPES } from '../../../../shared/modules/etsy/bulkOpsConstants';

const opTypeMap = {
  photos: FIELDS.PHOTOS
};

const getOpType = (type) => type.split('.').shift();

const getProductPropertyName = (type) => {
  const opType = getOpType(type);

  return opTypeMap[opType] || opType;
};

const applyOps = (product, operations) => {
  let result = fromJS(product);
  // apply each op
  _.each(operations, (op) => {
    const type = getOpType(op.type);
    // to its all associated products
    _.each(op.products, productId => {
      if (product.id === productId) {
        // update product
        const value = fromJS(op.value);

        const updated = bulkEditOps[type].apply(result, op.type, value, true);
        // but store it only if it is valid
        const status = bulkEditOps[type].validate(updated);

        if (status && status.get('valid')) {
          result = updated;
        }
      }
    });
  });
  return result.toJS();
};

function updateTemporaryIdsInVariations(tempVariations, variationIdMap, variationOptionsIdMap) {
  return _.reduce(tempVariations, (variations, tmpVariation, tmpVariationId) => {
    const variationId = variationIdMap[tmpVariationId];
    // replace temporary optionIds
    _.forEach(tmpVariation.options, (option) => {
      option.id = variationOptionsIdMap[tmpVariationId][option.id];
      return option;
    });
    // replace temporary variationId
    tmpVariation.id = variationId;
    variations[variationId] = tmpVariation;
    // remove the temporary one
    delete variations[tmpVariationId];
    return variations;
  }, {});
}

function updateTemporaryIdsInProductOfferings(productOfferings, variationIdMap, variationOptionsIdMap) {
  return _.map(productOfferings, productOffering => {
    productOffering.variationOptions = _.map(productOffering.variationOptions, variationOption => {
      const { optionId, variationId } = variationOption;
      const newOptionId = variationOptionsIdMap[variationId][optionId];
      const newVariationId = variationIdMap[variationId];
      if (newOptionId && newVariationId) {
        return {
          optionId: newOptionId,
          variationId: newVariationId
        };
      } else {
        throw new Error(`Failed to map variationId,optionId ${variationId}, ${optionId}, result: ${newVariationId}, ${newOptionId}`);
      }
    });
    return productOffering;
  });
}

async function updateTemporaryIdsForProduct(addVariationsResults, id, updatedProduct) {
  const variationIdsMap = _.reduce(_.pluck(addVariationsResults, 'variationIdMap'), _.extend);
  const optionIdsMap = _.reduce(_.pluck(addVariationsResults, 'optionsIdMap'), _.extend);
  updatedProduct.variations = updateTemporaryIdsInVariations(
    updatedProduct.variations, variationIdsMap, optionIdsMap);
  if (updatedProduct.productOfferings) {
    updatedProduct.productOfferings = updateTemporaryIdsInProductOfferings(updatedProduct.productOfferings, variationIdsMap, optionIdsMap);
  }
}

async function addVariationsForProduct(models, id, updatedProduct, t) {
  const variations = _.values(updatedProduct.variations);
  return models.variations.addVariations(id, variations, t);
}

async function deleteVariationsForProduct(models, id, t) {
  return models.variations.deleteByProductId(id, t);
}

async function updateVariations(models, updatedProduct, t) {
  await deleteVariationsForProduct(models, updatedProduct.id, t);
  const addVariationsResults = await addVariationsForProduct(models, updatedProduct.id, updatedProduct, t);
  await updateTemporaryIdsForProduct(addVariationsResults, updatedProduct.id, updatedProduct);
}

async function updateProductOfferings(models, updatedProduct, t) {
  await models.productOfferings.deleteByProductId(updatedProduct.id, t);
  const productOfferings = _.values(updatedProduct.productOfferings);
  await models.productOfferings.addProductOfferings(updatedProduct.id, productOfferings, t);
}

const getIncrementCounter = (shopId, models) => async () => {
  await models.shops.incrementApplyProgress(shopId, 1);
};

const camelizeKeys = (object) =>
  _.mapKeys(object, (value, key) => _.camelCase(key));

const updateAttributes = async (models, updatedProduct, transaction) => {
  const fields = ['id', 'productId', 'propertyId', 'scaleId', 'valueIds'];

  const rawAttributes = _.get(updatedProduct, FIELDS.ATTRIBUTES, []);
  const attributes = rawAttributes.map(attribute => _.pick(attribute, fields));
  const attributesMap = _.reduce(attributes, (result, attribute) => _.set(result, attribute.id, attribute), {});

  const rawDbAttributes = await models.attributes.getByProductId(updatedProduct.id, true);
  const dbAttributes = rawDbAttributes.map(attribute => _.pick(camelizeKeys(attribute), fields));
  const dbAttributesMap = _.reduce(dbAttributes, (result, attribute) => _.set(result, attribute.id, attribute), {});

  const modifiedAttributes = _.filter(attributes, attribute => !_.isEqual(_.get(dbAttributesMap, attribute.id), attribute));
  const deletedAttributes = _.filter(dbAttributes, attribute => !_.get(attributesMap, attribute.id));

  if (modifiedAttributes.length) {
    await models.attributes.upsertAttributes(updatedProduct.id, modifiedAttributes, transaction);
  }

  if (deletedAttributes.length) {
    const deletedAttributesIds = _.pluck(deletedAttributes, 'id');
    await models.attributes.deleteByIds(deletedAttributesIds, true, transaction);
  }
};

function getChangedProperties(product, updatedProduct) {
  const productKeys = _.keys(product);
  const updatedProductKeys = _.keys(updatedProduct);
  const allKeys = _.uniq(productKeys.concat(updatedProductKeys));

  return _.reduce(allKeys, (changedProperties, key) => {
    if (!_.isEqual(product[key], updatedProduct[key])) {
      changedProperties.push(key);
    }
    return changedProperties;
  }, []);
}

async function upsertVelaImage(models, hash, mime) {
  const image = await models.velaImages.getByHash(hash);
  if (image) {
    return image.id;
  }
  return models.velaImages.insert({ hash, mime });
}

async function addNewImage(models, shopId, image) {
  const velaImageId = await upsertVelaImage(models, image.hash, image.mime);
  return models.images.insert({ vela_image_id: velaImageId, shop_id: shopId });
}

function getUnusedImage(currentImages, productImages, hash) {
  const images = _.map(productImages, val => val.hash ? val : String(val));
  const imagesWithSameHash = _.filter(currentImages, { hash });
  const unusedImages = _.filter(imagesWithSameHash, image => images.indexOf(image.id) === -1);
  return unusedImages.shift();
}

async function createNewImages(models, shopId, product, currentImages) {
  for (let i = 0; i < product.photos.length; ++i) {
    const photo = product.photos[i];
    const hash = _.get(photo, 'hash');

    if (!hash) { continue; }

    const image = getUnusedImage(currentImages, product.photos, hash);

    if (image) {
      product.photos[i] = image.id;
      continue;
    }

    const imageId = await addNewImage(models, shopId, photo);
    currentImages.push({ id: imageId, hash });
    product.photos[i] = imageId;
  }

  return product;
}

async function updateProduct(productId, shop, updatedOps, additionalData, models, logger) {
  const shopId = shop.id;
  const incrementCounter = getIncrementCounter(shopId, models);

  // do everything in transaction
  return models.db.tx(async transaction => {
    const product = await models.products.getById(productId, transaction);

    // skip expired products until we fix issues with uploading expired products to etsy
    if (product.state === 'expired') { return; }

    if (additionalData.inventory) {
      // get variations
      const variations = await models.variations.getByProductIdsWithOptions([productId], transaction);
      _.set(product, FIELDS.VARIATIONS, _.get(variations, productId, {}));
      // get offerings info
      const productOfferings = await models.productOfferings.getByProductIds([productId], transaction);
      _.set(product, FIELDS.PRODUCT_OFFERINGS, _.get(productOfferings, productId, {}));
    }

    if (additionalData.attributes) {
      // get attributes
      const dbAttributes = await models.attributes.getByProductIds([productId]);
      const attributes = _.reduce(dbAttributes, (result, data) => {
        const attribute = _.mapKeys(data, (value, key) => _.camelCase(key));
        result.push(attribute);
        return result;
      }, []);
      _.set(product, FIELDS.ATTRIBUTES, attributes);
    }

    // apply operations
    let updatedProduct = applyOps(product, updatedOps);

    // create new images
    updatedProduct = await createNewImages(models, shopId, updatedProduct, additionalData.currentImages);

    const changedProperties = getChangedProperties(product, updatedProduct);

    // if, nothing changed on product, do nothing
    if (!changedProperties.length) { return; }

    if (changedProperties.indexOf(FIELDS.VARIATIONS) !== -1) {
      await updateVariations(models, updatedProduct, transaction);
    }

    if (changedProperties.indexOf(FIELDS.PRODUCT_OFFERINGS) !== -1) {
      await updateProductOfferings(models, updatedProduct, transaction);
    }

    if (changedProperties.indexOf(FIELDS.ATTRIBUTES) !== -1) {
      await updateAttributes(models, updatedProduct, transaction);
    }

    updatedProduct = _.reduce(changedProperties, (result, property) => _.set(result, property, updatedProduct[property]), {});
    updatedProduct[FIELDS.ID] = product[FIELDS.ID];
    updatedProduct[FIELDS.MODIFIED_BY_HIVE] = true;
    updatedProduct[FIELDS.CHANGED_PROPERTIES] = changedProperties;
    updatedProduct[FIELDS.HIVE_LAST_MODIFIED_TSZ] = moment().toISOString();

    await models.products.update(updatedProduct, transaction);
  }).then(incrementCounter).catch(error => {
    // we should increment counter even on error
    incrementCounter();
    // log error
    logger.error('Exception in applyOperations::updateProduct', { error: error, productId, updatedOps });
  });
}

async function updateProductsByOps(models, shop, ops, config, logger) {
  const shopId = shop.id;
  // get current shop images
  const currentImages = await models.compositeRequests.getImagesByShopId(shopId);
  // get updated types/properties
  const types = _.unique(_.map(ops, op => getProductPropertyName(op.type)));
  // should we process product offerings?
  const additionalData = {
    inventory: !!_.find(types, type => INVENTORY_OP_TYPES.indexOf(type) !== -1),
    attributes: !!_.find(types, type => ATTRIBUTES_OP_TYPES.indexOf(type) !== -1),
    currentImages
  };

  // update missing section records
  const updatedOps = await createMissingSections(models, shopId, ops);

  // get all ids of updated products
  const ids = _.filter(_.unique(_.reduce(updatedOps, (res, op) => res.concat(op.products), [])), id => !!id);

  // update products one by one, but run N parallel updates. update each product in its own transaction
  const batches = _.chunk(ids, config.syncUpdatesBatchSize);
  for (let i = 0; i < batches.length; ++i) {
    await Promise.all(batches[i].map(id => updateProduct(id, shop, updatedOps, additionalData, models, logger)));
  }
}

export default async (config, models, logger, shop, operations) => {
  if (!_.isArray(operations) && !operations.length) { throw new Error(`Invalid operations: ${JSON.stringify(operations)}`); }

  try {
    // aply bulk operations
    await updateProductsByOps(models, shop, operations, config, logger);
  } catch (error) {
    logger.error('Failed to apply ops with unhandled error', error);
  }

  // clear shop apply counters
  await models.shops.applyFinished(shop.id);
};
