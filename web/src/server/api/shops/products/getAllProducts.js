import _ from 'lodash';
import Promise from 'bluebird';
import * as Utils from '../../utils';

const IMAGES_ROUTE_BASE = '/api/v1/images';
import { FIELDS } from '../../../../../../shared/modules/etsy/constants';
import { isTrue } from '../../../../../../shared/modules/utils/boolString';

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

export default (config, models) => {
  return (req, res) => {
    // get user_id and  filter options
    const { denorm, id, offset, limit } = req.query;
    const includeProductOfferings = isTrue(req.query.includeProductOfferings);
    const includeVariations = isTrue(req.query.includeVariations);
    const ids = Utils.getAsArray(id);
    const result = {};

    if (!ids.length) { res.json({}); }

    const retrieveImagesByIdForProducts = async (products, productsById) => {
      const imagesIds = _.filter(_.uniq(_.reduce(products, (images, productId) => images.concat(productsById[productId][FIELDS.PHOTOS]), [])), imageId => !!imageId);
      const images = await models.images.getByIds(imagesIds);
      const imagesById = Utils.normalizePartially('images', _.map(images, image => {
        if (!image.thumbnail_url) {
          image.thumbnail_url = `${IMAGES_ROUTE_BASE}/${image.id}`;
        }
        if (!image.fullsize_url) {
          image.fullsize_url = `${IMAGES_ROUTE_BASE}/${image.id}`;
        }
        return image;
      }));
      return imagesById.imagesById;
    };

    const setProductsOnResultObject = async (products) => {
      const normalizedProducts = Utils.normalize('products', products);
      result.products = normalizedProducts.products;
      result.productsById = normalizedProducts.productsById;
      result.count = products.length;
      if (includeVariations) {
        const variations = await models.productVariations.getByProductIdsWithOptions(ids);
        Object.keys(variations).forEach(productId => {
          result.productsById[productId].variations = variations[productId];
        });

        if (includeProductOfferings) {
          const offerings = await models.productOfferings.getByProductIds(ids);
          Object.keys(offerings).forEach(productId => {
            // sort product offerings
            const productVariations = result.productsById[productId].variations;
            const sortedOfferings = sortProductOfferings(productVariations, offerings[productId]);
            result.productsById[productId].productOfferings = sortedOfferings;
          });
        }
      }
      result.imagesById = await retrieveImagesByIdForProducts(normalizedProducts.products, normalizedProducts.productsById);

      // get attributes
      const attributes = await models.attributes.getByProductIds(ids);
      _.each(attributes, data => {
        const attribute = _.mapKeys(data, (value, key) => _.camelCase(key));
        const key = `productsById.${attribute.productId}.attributes`;
        const productAttributes = _.get(result, key) || [];
        productAttributes.push(attribute);
        _.set(result, key, productAttributes);
      });
    };

    const denormalizeProducts = async (products) => {
      const denorms = await Utils.denorm(models, denorm, products);
      _.each(denorms, data => _.extend(result, data));
    };

    const productsAndProductCount = models.products.getAll(Utils.getAsArray(id), offset, limit);
    return Promise.all([
      productsAndProductCount.then(setProductsOnResultObject),
      productsAndProductCount.then(denormalizeProducts)
    ]).then(() => {
      res.json(result);
    }).catch(err => {
      res.status(500).json({error: err.message});
    });
  };
};
