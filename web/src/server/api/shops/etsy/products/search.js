import _ from 'lodash';
import Promise from 'bluebird';

import * as Utils from '../../../utils';

async function getProductPromise(models, shopId, offset, limit, fields, filters) {
  const products = await models.products.getFiltered(shopId, offset, limit, fields, filters);
  const result = Utils.normalize('products', products);

  if (!_.isEmpty(result.products)) {
    const variations = await models.productVariations.getByProductIdsWithOptions(result.products);
    Object.keys(variations).forEach(productId => {
      result.productsById[productId].variations = variations[productId];
    });
    const imageIds = _.uniq(_.reduce(result.products, (ids, productId) => ids.concat(_.get(result, ['productsById', productId, 'photos', 0], [])), []));
    const images = await models.images.getByIds(imageIds);
    result.imagesById = _.reduce(images, (map, image) => _.set(map, image.id, image), {});
  }

  return result;
}

const getProductData = (models, userId, shopId, query) => {
  // eslint-disable-next-line no-unused-vars
  const { offset, limit, fields, options, denorm, ...filters } = query;
  const optionsArray = Utils.getAsArray(options);
  const optionsMap = _.reduce(optionsArray, (result, option) => {
    if (_.isString(option) && option) {
      result[option.toLowerCase().trim()] = true;
    }
    return result;
  }, {});
  const useDefault = _.isEmpty(optionsMap);
  const promises = [];
  promises.push(models.userProfiles.update(userId, { last_seen_shop: shopId }));
  if (!useDefault && _.isEqual(_.keys(optionsMap), ['products']) && _.isEqual(fields, ['id'])) {
    promises.push(models.products.getFilteredOnlyIds(shopId, offset, limit, filters).then(products => ({ products }) ));
    return Promise.all(promises);
  }
  if (useDefault || optionsMap.products) {
    promises.push(getProductPromise(models, shopId, offset, limit, fields, filters));
  }
  if (useDefault || optionsMap.counts) {
    promises.push(models.products.getFilteredCount(shopId, filters));
  }
  if (useDefault || optionsMap.filters) {
    promises.push(models.products.getFilteredFilters(shopId, filters));
  }
  if (useDefault || optionsMap.statuscounts) {
    promises.push(models.products.getStatesCounts(shopId));
  }

  return Promise.all(promises);
};

export default async (config, models, rabbitClient, req, res) => {
  // get user_id and  filter options
  const { userId } = req.session;
  const { shopId } = req.params;
  const { denorm } = req.body;

  res.perfData = { shopId, timings: {} };

  try {
    const result = {};
    let denorms = {};
    const responses = await getProductData(models, userId, shopId, req.body);
    // add products, product count, and filters to the result
    _.each(responses, response => response && _.extend(result, response));
    // denorm properties
    if (_.isArray(responses[1].products) && responses[1].products.length && !_.isEmpty(responses[1].productsById)) {
      const productsArray = _.map(responses[1].products, productId => responses[1].productsById[productId]);
      denorms = await Utils.denorm(models, denorm, productsArray);
    }

    // apply denorm to result object
    _.each(denorms, data => _.extend(result, data));
    // we get what we wanted, send it to the client
    res.json(result);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};
