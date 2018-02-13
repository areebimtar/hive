import _ from 'lodash';
import { fromJS, Map, List } from 'immutable';

import { APICall } from 'shared/utils/api';
import { FIELDS } from 'global/modules/shopify/constants';
import * as CONSTANTS from 'app/client/constants';

const PRODUCT_FIELDS = [
  FIELDS.ID, FIELDS.TITLE, FIELDS.PUBLISHED_AT, FIELDS.UPDATED_AT, FIELDS.PHOTOS, FIELDS.PRODUCT_TYPE, FIELDS.VENDOR
];

const FILTER_GROUP_ORDER = fromJS([FIELDS.PUBLISHED_AT, FIELDS.PRODUCT_TYPE, FIELDS.VENDOR, FIELDS.TAGS]);

const PRODUCT_PUBLISHED_AT_STATES = fromJS([
  { name: 'Published', value: 'published', count: 0 },
  { name: 'Unpublished', value: 'unpublished', count: 0 }
]);

const filtersMenuMap = fromJS({
  [FIELDS.PUBLISHED_AT]: 'Listings',
  [FIELDS.TAGS]: 'Tags',
  [FIELDS.PRODUCT_TYPE]: 'Product Type',
  [FIELDS.VENDOR]: 'Vendor',
  [CONSTANTS.MAGIC]: 'Magic'
});

function getProducts(productsData) {
  const imagesMap = productsData.get('imagesById', new Map());
  return productsData.get('products', new List()).map(productId => {
    const product = productsData.getIn(['productsById', String(productId)], new Map());
    return product
      .set(FIELDS.PHOTOS, product.get(FIELDS.PHOTOS, new List()).map(imageId => imagesMap.get(String(imageId))));
  });
}

const getPublishedAtFilters = (productsData, filters) => {
  return PRODUCT_PUBLISHED_AT_STATES.map(state =>
    state
      .set('count', productsData.getIn(['filters', FIELDS.PUBLISHED_AT, state.get('value')], 0))
      .set('selected', state.get('value') === _.get(filters, FIELDS.PUBLISHED_AT)));
};

const filterCountSortFn = (left, right) => {
  const value = item => parseInt(item.get('count', 0), 10);
  const name = item => item.get('name', '');
  const countCmp = value(right) - value(left);
  return countCmp === 0 ? name(left).localeCompare(name(right)) : countCmp;
};

function getFieldFilters(fieldName, productsData, filters) {
  const groupFilters = _.get(filters, fieldName, []);
  return productsData.getIn(['filters', fieldName], new Map())
    .reduce((result, count, name) => {
      return result.set(name, new Map({ count, name, value: new List([name]), selected: groupFilters.indexOf(name) !== -1 }));
    }, new Map())
    .toList()
    .sort(filterCountSortFn);
}

const FILTER_TYPES = {
  [FIELDS.PUBLISHED_AT]: 'main'
};

const FILTERS = {
  [FIELDS.PUBLISHED_AT]: getPublishedAtFilters,
  [FIELDS.TAGS]: getFieldFilters.bind(null, FIELDS.TAGS),
  [FIELDS.PRODUCT_TYPE]: getFieldFilters.bind(null, FIELDS.PRODUCT_TYPE),
  [FIELDS.VENDOR]: getFieldFilters.bind(null, FIELDS.VENDOR)
};

function getProductsFilters(productsData, filters) {
  return FILTER_GROUP_ORDER
    .map(groupName =>
      new Map({ type: FILTER_TYPES[groupName] || 'secondary', groupName, filters: FILTERS[groupName](productsData, filters) }))
    .filter(filter => filter.get('filters').size);
}

function makeAPICall(shopId, filters) {
  const params = _.cloneDeep(filters);
  params.fields = PRODUCT_FIELDS;

  // make an API call
  return APICall({method: 'put', url: `/shops/${shopId}/products/search`, payload: params});
}

export const getFilteredProductsAndFilters = async (shopId, filters = {}) => {
  const productsData = await makeAPICall(shopId, filters);

  const productsDataJS = fromJS(productsData);
  return new Map({
    filtersMenuMap: filtersMenuMap,
    filters: getProductsFilters(productsDataJS, filters),
    products: getProducts(productsDataJS),
    count: productsData.count
  });
};

export function getInitialFilters() {
  return new Map({ [FIELDS.PUBLISHED_AT]: 'published' });
}

export function addReducers(reducer) {
  return reducer;
}
