import _ from 'lodash';
import { Map, List } from 'immutable';

import { PAGINATION_OFFSET, PAGINATION_INITIAL_LIMIT, PAGINATION_MAX_LIMIT } from 'app/client/constants';

export const getPageInfo = (filters, productsTotal) => {
  const offset = filters.offset || 0;
  const limit = _.isUndefined(filters.limit) ? PAGINATION_INITIAL_LIMIT : filters.limit | 0;
  const initialPage = limit === PAGINATION_INITIAL_LIMIT;
  const from = offset + 1;
  const to = Math.min(offset + limit, productsTotal);
  const prevFrom = Math.max(from - PAGINATION_OFFSET, 1);
  const prevTo = Math.min(from - PAGINATION_OFFSET + PAGINATION_MAX_LIMIT, productsTotal);
  const nextFrom = Math.max(from + (initialPage ? 0 : PAGINATION_OFFSET), 0);
  const nextTo = Math.min(from + (initialPage ? PAGINATION_MAX_LIMIT : PAGINATION_OFFSET + PAGINATION_MAX_LIMIT), productsTotal);

  return {
    from,
    to: to,
    total: productsTotal,
    showPrev: !!offset,
    showPrevMsg: `Show <span class="from">${prevFrom}</span> - <span class="to">${prevTo}</span> of <span class="total">${productsTotal}</span>`,
    showNext: to !== productsTotal,
    showNextMsg: `Show <span class="from">${nextFrom}</span> - <span class="to">${nextTo}</span> of <span class="total">${productsTotal}</span>`
  };
};

export function* previousProducts(reduction, path, updateAction) {
  // get filters
  const filters = reduction.getIn([...path, 'filters']).toJS();
  // get new offset
  const offset = Math.max(filters.offset - PAGINATION_OFFSET, 0);
  // if offset is the same, do nothing
  if (offset === filters.offset) { return reduction; }
  // set new offset
  if (filters.limit === PAGINATION_MAX_LIMIT) {
    filters.offset = offset;
  }
  // set limit
  filters.limit = PAGINATION_MAX_LIMIT;
  // update products listing
  if (updateAction) {
    yield (dispatch) => dispatch(updateAction(filters));
  }
  return reduction;
}

export function* nextProducts(reduction, path, updateAction) {
  // get total count of products
  const productsTotal = reduction.getIn([...path, 'productsTotal']);
  // get filters
  const filters = reduction.getIn([...path, 'filters']).toJS();
  // get new offset
  const offset = filters.offset + PAGINATION_OFFSET;
  // if offset is the same, do nothing
  if (offset >= productsTotal) { return reduction; }
  // set new offset
  if (filters.limit === PAGINATION_MAX_LIMIT) {
    filters.offset = offset;
  }
  // set limit
  filters.limit = PAGINATION_MAX_LIMIT;
  // update products listing
  if (updateAction) {
    yield (dispatch) => dispatch(updateAction(filters));
  }
  return reduction;
}

export function toggleProduct(reduction, path, productId) {
  // get products and selectedProducts
  let products = reduction.getIn([...path, 'products']);
  const productsTotal = reduction.getIn([...path, 'productsTotal']);
  let selectedProducts = reduction.getIn([...path, 'selectedProducts']);
  const product = products.find(item => item.get('id') === productId);
  // skip toggle if product is in inline edit mode
  if (product.get('_inInlineEditing')) { return reduction; }

  // toggle selection for productId
  selectedProducts = selectedProducts.updateIn([productId], state => !state);
  // count selected products
  selectedProducts = selectedProducts.set('selected', selectedProducts
    .map((value, key) => !!value && !_.isNaN(parseInt(key, 10)))
    .filter(value => value)
    .size);
  // update product selected flag
  const index = products.findIndex(item => item.get('id') === productId);
  products = products.updateIn([index, 'selected'], state => !state);
  // are all products in view selected?
  selectedProducts = selectedProducts.set('selectedAllVisible', !products.find(item => !item.get('selected')));
  // are all products selected?
  selectedProducts = selectedProducts.set('selectedAll', selectedProducts.get('selected') === productsTotal);
  // update selectedProducts and toggle selected product
  return reduction
    .setIn([...path, 'products'], products)
    .setIn([...path, 'selectedProducts'], selectedProducts);
}

export function toggleAllVisibleProducts(reduction, path) {
  // get selectedAll checkbox
  const selectedAllVisible = !reduction.getIn([...path, 'selectedProducts', 'selectedAllVisible']);
  // toggle(set to selectedAllVisible value) selected in all products
  const products = reduction
    .getIn([...path, 'products'], new List())
    .map(product => product.set('selected', selectedAllVisible));
  const productsTotal = reduction.getIn([...path, 'productsTotal']);
  // update selection
  const selectedProducts = products
    .reduce((result, product) => result.set(product.get('id'), selectedAllVisible), new Map())
    .set('selected', selectedAllVisible ? products.size : 0)
    .set('selectedAllVisible', selectedAllVisible)
    .set('selectedAll', products.size === productsTotal);
  // set new products and selectedProducts and return new immutable
  return reduction
    .setIn([...path, 'products'], products)
    .setIn([...path, 'selectedProducts'], selectedProducts);
}
