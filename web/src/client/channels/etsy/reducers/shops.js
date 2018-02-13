import _ from 'lodash';
import Promise from 'bluebird';
import { fromJS, Map, List } from 'immutable';

import { APICall } from 'shared/utils/api';
import { FIELDS } from 'global/modules/etsy/constants';
import { getTopTaxonomyName } from 'global/modules/etsy/bulkEditOps/taxonomyUtils';
import * as CONSTANTS from 'app/client/constants';

const PRODUCT_FIELDS = [
  FIELDS.ID, FIELDS.TITLE, FIELDS.QUANTITY, FIELDS.PRICE,
  FIELDS.CREATION_TSZ, FIELDS.ENDING_TSZ, FIELDS.HIVE_LAST_MODIFIED_TSZ,
  FIELDS.STATE_TSZ, FIELDS.SECTION_ID, FIELDS.PHOTOS
];

const FILTER_GROUP_ORDER = fromJS([
  FIELDS.STATE,
  FIELDS.TAXONOMY_ID,
  FIELDS.SECTION_ID,
  FIELDS.TAGS,
  FIELDS.MATERIALS
]);

const PRODUCT_STATES = fromJS([
  { name: 'Active', value: 'active', count: 0 },
  { name: 'Draft', value: 'draft', count: 0 },
  { name: 'Inactive', value: 'inactive', count: 0 }
]);

const filtersMenuMap = fromJS({
  [FIELDS.TAXONOMY_ID]: 'CATEGORIES',
  [FIELDS.SECTION_ID]: 'SECTION',
  [FIELDS.TAGS]: 'TAGS',
  [FIELDS.MATERIALS]: 'MATERIALS',
  [CONSTANTS.MAGIC]: 'MAGIC'
});

function getProducts(productsData, sectionsData) {
  const imagesMap = productsData.get('imagesById', new Map());
  return productsData.get('products', new List()).map(productId => {
    const product = productsData.getIn(['productsById', String(productId)], new Map());
    return product
      .set('optionBasedPricesCount', 0) // FIXME: how is this thing calculated?
      .set(FIELDS.SECTION_ID, sectionsData.get(product.get(FIELDS.SECTION_ID)))
      .set(FIELDS.PHOTOS, product.get(FIELDS.PHOTOS, new List()).map(imageId => imagesMap.get(String(imageId))));
  });
}

const filterCountSortFn = (left, right) => {
  const value = item => parseInt(item.get('count', 0), 10);
  const name = item => item.get('name', '');
  const countCmp = value(right) - value(left);
  return countCmp === 0 ? name(left).localeCompare(name(right)) : countCmp;
};

function getStateFilters(productsData, sectionsData, filters) {
  return PRODUCT_STATES.map(state =>
    state
      .set('count', productsData.getIn(['stateCounts', state.get('value')], 0))
      .set('selected', state.get('value') === _.get(filters, FIELDS.STATE)));
}

function getTaxonomyFilters(productsData, sectionsData, filters) {
  const taxonomyFilters = _.get(filters, FIELDS.TAXONOMY_ID, []);
  return productsData.getIn(['filters', FIELDS.TAXONOMY_ID], new Map())
    .reduce((result, count, filter) => {
      const name = getTopTaxonomyName(filter);
      if (!name) { return result; }
      if (result.has(name)) {
        return result
          .updateIn([name, 'count'], value => value + count)
          .updateIn([name, 'value'], values => values.push(filter))
          .setIn([name, 'selected'], taxonomyFilters && taxonomyFilters.indexOf(filter) !== -1);
      }
      return result.set(name, new Map({ count, name, value: new List([filter]), selected: taxonomyFilters && taxonomyFilters.indexOf(filter) !== -1 }));
    }, new Map())
    .toList()
    .sort(filterCountSortFn);
}

function getSectionFilters(productsData, sectionsData, filters) {
  const sectionFilters = _.get(filters, FIELDS.SECTION_ID, []);
  return productsData.getIn(['filters', FIELDS.SECTION_ID], new Map())
    .reduce((result, count, sectionId) => {
      const name = sectionsData.get(sectionId, sectionId);
      if (!name) { return result; }
      return result.set(name, new Map({ count, name, value: new List([sectionId]), selected: sectionFilters && sectionFilters.indexOf(sectionId) !== -1 }));
    }, new Map())
    .toList()
    .sort(filterCountSortFn);
}

function getFilters(groupName, productsData, sectionsData, filters) {
  const groupFilters = _.get(filters, groupName, []);
  return productsData.getIn(['filters', groupName], new Map())
    .reduce((result, count, name) => {
      return result.set(name, new Map({ count, name, value: new List([name]), selected: groupFilters.indexOf(name) !== -1 }));
    }, new Map())
    .toList()
    .sort(filterCountSortFn);
}

const FILTER_TYPES = {
  [FIELDS.STATE]: 'main'
};

const FILTERS = {
  [FIELDS.STATE]: getStateFilters,
  [FIELDS.TAXONOMY_ID]: getTaxonomyFilters,
  [FIELDS.SECTION_ID]: getSectionFilters,
  [FIELDS.TAGS]: getFilters.bind(null, FIELDS.TAGS),
  [FIELDS.MATERIALS]: getFilters.bind(null, FIELDS.MATERIALS)
};

function getProductsFilters(productsData, sectionsData, filters) {
  return FILTER_GROUP_ORDER
    .map(groupName =>
      new Map({ type: FILTER_TYPES[groupName] || 'secondary', groupName, filters: FILTERS[groupName](productsData, sectionsData, filters) }))
    .filter(filter => filter.get('filters').size);
}

function makeAPICalls(shopId, filters) {
  const params = _.cloneDeep(filters);
  params.fields = PRODUCT_FIELDS;

  // make an API call
  return Promise.all([
    APICall({method: 'put', url: `/shops/${shopId}/products/search`, payload: params}),
    APICall({method: 'get', url: `/shops/${shopId}/channelData`})
  ]);
}

export async function getFilteredProductsAndFilters(shopId, filters = {}) {
  const [productsData, channelData] = await makeAPICalls(shopId, filters);

  const productsDataJS = fromJS(productsData);
  const sectionsDataJS = fromJS(channelData.sectionsMap);
  return new Map({
    filtersMenuMap: filtersMenuMap,
    filters: getProductsFilters(productsDataJS, sectionsDataJS, filters),
    products: getProducts(productsDataJS, sectionsDataJS),
    count: productsData.count
  });
}

export function getInitialFilters() {
  return new Map({ state: 'active' });
}

export function addReducers(reducer) {
  return reducer;
}
