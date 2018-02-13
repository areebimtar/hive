import _ from 'lodash';
import Promise from 'bluebird';
import * as Utils from '../../../utils';

const IMAGES_ROUTE_BASE = '/api/v1/images';
import { FIELDS } from 'global/modules/etsy/constants';

const sortProductOfferings = (variations, productOfferings) => {
  const firstVariationId = _.get(_.find(variations, variation => variation.first), 'id');

  // swap product offerings options (if needed)
  const offerings = _.map(productOfferings, offering => {
    const newOptions = offering.variationOptions.sort((left, right) => (right.variationId === firstVariationId) - (left.variationId === firstVariationId));
    return _.set(offering, 'variationOptions', newOptions);
  });

  // sort product offerings using sequence
  const nOfferings = _.get(offerings, '[0].variationOptions.length', 0);
  offerings.sort((left, right) => {
    for (let index = 0; index < nOfferings; ++ index) {
      if (left.variationOptions[index].sequence !== right.variationOptions[index].sequence) {
        return left.variationOptions[index].sequence - right.variationOptions[index].sequence;
      }
    }
    return 0;
  });

  // remove sequence number
  _.each(offerings, offering => _.each(offering.variationOptions, option => delete option.sequence));

  return offerings;
};

const retrieveImagesByIdForProducts = async (models, normalizedProducts) => {
  const { products, productsById } = normalizedProducts;
  const imagesIds = _.compact(_.uniq(_.reduce(products, (images, productId) => images.concat(productsById[productId][FIELDS.PHOTOS]), [])));
  const images = await models.images.getByIds(imagesIds);
  const normalizedImages = Utils.normalizePartially('images', _.map(images, image => {
    if (!image.thumbnail_url) {
      image.thumbnail_url = `${IMAGES_ROUTE_BASE}/${image.id}`;
    }
    if (!image.fullsize_url) {
      image.fullsize_url = `${IMAGES_ROUTE_BASE}/${image.id}`;
    }
    return image;
  }));
  return normalizedImages.imagesById;
};

const getProductsWithProperties = async (models, ids, products) => {
  const result = {};
  const normalizedProducts = Utils.normalize('products', products);
  result.products = normalizedProducts.products;
  result.productsById = normalizedProducts.productsById;
  result.count = products.length;

  const variations = await models.productVariations.getByProductIdsWithOptions(ids);
  Object.keys(variations).forEach(productId => {
    result.productsById[productId].variations = variations[productId];
  });

  const offerings = await models.productOfferings.getByProductIds(ids);
  Object.keys(offerings).forEach(productId => {
    // sort product offerings
    const productVariations = result.productsById[productId].variations;
    const sortedOfferings = sortProductOfferings(productVariations, offerings[productId]);
    result.productsById[productId].productOfferings = sortedOfferings;
  });

  result.imagesById = await retrieveImagesByIdForProducts(models, normalizedProducts);

  // get attributes
  const attributes = await models.attributes.getByProductIds(ids);
  _.each(attributes, data => {
    const attribute = _.mapKeys(data, (value, key) => _.camelCase(key));
    const key = `productsById.${attribute.productId}.attributes`;
    const productAttributes = _.get(result, key) || [];
    productAttributes.push(attribute);
    _.set(result, key, productAttributes);
  });

  return result;
};

const denormalizeProducts = async (models, denorm, products) => {
  const result = {};
  const denorms = await Utils.denorm(models, denorm, products);
  _.each(denorms, data => _.extend(result, data));

  return result;
};

export default (config, models, rabbitClient, req, res) => {
  // get user_id and  filter options
  const { denorm, id, offset, limit } = req.query;
  const ids = Utils.getAsArray(id);

  if (!ids.length) { res.json({}); }

  const productsAndProductCount = models.products.getAll(Utils.getAsArray(id), offset, limit);
  return Promise.all([
    productsAndProductCount.then(getProductsWithProperties.bind(null, models, ids)),
    productsAndProductCount.then(denormalizeProducts.bind(null, models, denorm))
  ]).then((results) => {
    const result = _.reduce(results, (combinedResult, partialResult) => _.extend(combinedResult, partialResult), {});
    res.json(result);
  }).catch(err => {
    res.status(500).json({error: err.message});
  });
};
