import _ from 'lodash';
import { fromJS, Map, List } from 'immutable';
import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import ACTION_CONSTANTS from '../constants/actions';
import * as CONSTANTS from 'app/client/constants';
import * as utils from '../utils';
import { APICall } from 'shared/utils/api';
import initialState from '../initialState';
import * as boolString from 'global/modules/utils/boolString';

import { CHANNEL_NAMES } from 'global/constants';
import { PAGINATION_INITIAL_LIMIT, PAGINATION_MAX_LIMIT } from 'app/client/constants';

import { getChannelById } from 'app/client/channels';

const processFilteredData = (reduction, data) => {
  // shape response
  const filters = reduction.getIn(['shopView', 'filters']).toJS();
  const selectedProducts = reduction.getIn(['shopView', 'selectedProducts']);
  // products array
  const products = data.get('products', new List()).map(product =>
    product.set('selected', !!selectedProducts.get(product.get('id'))));
  // total products count
  const productsTotal = parseInt(data.get('count'), 10);
  // filters group name map
  const filtersMenuMap = data.get('filtersMenuMap', new Map());

  // selected all products in view?
  const selectedAllVisible = (products.length) ? !_.find(products, { selected: false }) : false;
  // page info
  const page = utils.getPageInfo(filters, productsTotal);

  return reduction
    .setIn(['shopView', 'products'], products)
    .setIn(['shopView', 'productsTotal'], productsTotal)
    .setIn(['shopView', 'productsFilters'], data.get('filters'))
    .setIn(['shopView', 'page'], fromJS(page))
    .setIn(['shopView', 'selectedProducts', 'selectedAllVisible'], selectedAllVisible)
    .setIn(['shopView', 'filtersMenuMap'], filtersMenuMap);
};

function* handleFailedActions(reduction, error) {
  return reduction.updateIn(['notifications', 'errors'], errors => { errors.push(error); return errors; });
}

// dropdown
function* toggleDropdown(reduction) {
  return reduction.updateIn(['shopView', 'dropdown', 'open'], open => !open);
}

function* navigateToShop(reduction, shopId) {
  yield dispatch => dispatch(Actions.Application.navigateToShop(shopId));

  const currentShopId = reduction.getIn(['shopView', 'shopId']);
  if (currentShopId === shopId) { return reduction; }

  return reduction
    .set('shopView', initialState.get('shopView'));
}

function* closeIntroVideoModal(reduction) {
  APICall({method: 'put', url: '/users', payload: {introVideoModalOpen: 'false'}});
  return reduction
    .setIn(['userProfile', 'introVideoModalOpen'], 'false');
}

function* closeSyncStatusModal(reduction) {
  yield (dispatch) => dispatch(Actions.Application.setBooleanProfileValue({ name: 'syncStatusModalSeen', value: true }));
  return reduction
    .setIn(['userProfile', 'syncStatusModalSeen'], true)
    .setIn(['shopView', 'syncStatusModalOpen'], false);
}

function* openSyncStatusModal(reduction, shouldOpen = true) {
  yield (dispatch) => setTimeout(() => dispatch(Actions.Shops.closeSyncStatusModal()), CONSTANTS.SYNC_STATUS_MODAL_TIMEOUT);

  return reduction
    .setIn(['shopView', 'syncStatusModalOpen'], shouldOpen);
}

// set shop
function* setShopId(reduction, data) {
  const { shopId, channelId, force } = data;
  const currentShopId = reduction.getIn(['shopView', 'shopId']);
  if (!shopId || (shopId === currentShopId && !force)) { return reduction; }

  const filters = initialState
    .getIn(['shopView', 'filters'], new Map())
    .merge(getChannelById(channelId).reducers.shops.getInitialFilters())
    .toJS();

  yield dispatch => dispatch(Actions.Application.setShopId(shopId));
  yield dispatch => dispatch(Actions.Shops.setFilters(filters));

  return reduction
    .setIn(['shopView', 'shopId'], shopId)
    .setIn(['shopView', 'channelId'], channelId);
}

// previous/next products
function* previousProducts(reduction, data) {
  const shouldScroll = reduction.getIn(['shopView', 'page', 'showPrev']);
  // const firstRowHeight = data.rowMetrics[0].height;
  const cutedRows = data.rowMetrics.slice((-0.5 * PAGINATION_MAX_LIMIT) - 1, -1);
  const heightRemoved = _.reduce(cutedRows, (d, row) => d + row.height, 0);
  const delta = data.scrollHeight - heightRemoved - data.scrollTop;

  if (!shouldScroll) {
    return yield* utils.previousProducts(reduction, ['shopView'], Actions.Shops.updateFilters);
  }
  return yield* utils.previousProducts(reduction.setIn(['shopView', 'tableScroll'], fromJS({direction: 'up', delta})), ['shopView'], Actions.Shops.updateFilters);
}

function* nextProducts(reduction, data) {
  const currentLimit = reduction.getIn(['shopView', 'filters', 'limit']);
  const shouldScroll = reduction.getIn(['shopView', 'page', 'showNext']) && currentLimit === PAGINATION_MAX_LIMIT;
  const cutedRows = data.rowMetrics.slice(1, (0.5 * PAGINATION_MAX_LIMIT) + 1);
  const heightRemoved = _.reduce(cutedRows, (d, row) => d + row.height, 0);
  const delta = Math.max(data.scrollTop - heightRemoved, 0);

  if (!shouldScroll) {
    return yield* utils.nextProducts(reduction, ['shopView'], Actions.Shops.updateFilters);
  }

  return yield* utils.nextProducts(reduction.setIn(['shopView', 'tableScroll'], fromJS({direction: 'down', delta})), ['shopView'], Actions.Shops.updateFilters);
}

// set/update magicOptions
function* setMagicOptions(reduction) {
  let newState;
  if (boolString.isTrue(reduction.getIn(['userProfile', CONSTANTS.MAGIC]))) {
    const magicOptions = _.map(CONSTANTS.MAGIC_SETTINGS, (magicSetting) => {
      const itemSelected = boolString.isTrue(reduction.getIn(['userProfile', magicSetting.key]));
      return {
        key: magicSetting.key,
        title: magicSetting.title,
        selected: itemSelected
      };
    });
    newState = fromJS(magicOptions);
  } else {
    newState = initialState.getIn(['shopView', 'magicOptions']);
  }

  return reduction.setIn(['shopView', 'magicOptions'], newState);
}

const flattenFilters = (filters) => {
  return _.reduce(filters, (result, value, key) => {
    if (!_.isObject(value) || _.isEmpty(value)) {
      return _.set(result, key, value);
    }

    const newValue = _.reduce(value, (array, set, filter) => {
      if (set) {
        array.push(filter);
      }
      return array;
    }, []);

    if (!newValue.length) { return result; }

    return _.set(result, key, newValue);
  }, {});
};

function* setMainFilters(reduction, newFilters) {
  newFilters.offset = 0;
  newFilters.limit = PAGINATION_INITIAL_LIMIT;
  yield (dispatch) => dispatch(Actions.Shops.setFilters(newFilters));

  return reduction
    .setIn(['shopView', 'expandedGroups'], initialState.getIn(['shopView', 'expandedGroups']))
    .setIn(['shopView', 'selectedProducts'], initialState.getIn(['shopView', 'selectedProducts']))
    .deleteIn(['combined', 'form']);
}

// set/update filters
function* setFilters(reduction, newFilters) {
  const shopId = reduction.getIn(['shopView', 'shopId']);
  const channelId = reduction.getIn(['shopView', 'channelId']);
  const currentFilters = reduction.getIn(['shopView', 'filters']).toJS();
  const defualtFilters = initialState.getIn(['shopView', 'filters']).toJS();
  let filters = defualtFilters;
  // if new filters are empty, get initial ones
  if (!_.isEmpty(newFilters)) {
    filters = newFilters;
  } else if (!_.isEmpty(currentFilters)) {
    filters = currentFilters;
  }

  if (shopId) {
    yield (dispatch) => getChannelById(channelId).reducers.shops.getFilteredProductsAndFilters(shopId, flattenFilters(filters))
      .then((data) => {
        dispatch(Actions.Shops.setFiltersSucceeded(data));
        dispatch(Actions.Analytics.setShopContext());
      })
      .catch((error) => dispatch(Actions.Shops.setFiltersFailed(error.error)));
  }
  return reduction
    .setIn(['shopView', 'filters'], fromJS(filters));
}

// "merges" old and new value of filters
// - the value in new overrides values in old
// - if query is changed then pagination is reset (to the values in initialState)
// input parameters are plain objects (no immutablejs)
function computeNewFilters(oldFilters, newFilters) {
  const filters = { ... oldFilters, ... newFilters};

  const queryChanged = oldFilters.q !== newFilters.q;
  const filtersSet = newFilters.offset && newFilters.limit;
  if (queryChanged && !filtersSet) {
    const { offset, limit } = initialState.getIn(['shopView', 'filters']).toJS();
    filters.offset = offset;
    filters.limit =  limit;
  }
  return filters;
}

function* updateFilters(reduction, newFilters) {
  const shopId = reduction.getIn(['shopView', 'shopId']);
  const channelId = reduction.getIn(['shopView', 'channelId']);
  const currentFilters = reduction.getIn(['shopView', 'filters']).toJS();
  const filters = computeNewFilters(currentFilters, newFilters);

  if (shopId) {
    yield (dispatch) => getChannelById(channelId).reducers.shops.getFilteredProductsAndFilters(shopId, flattenFilters(filters))
      .then((data) => {
        dispatch(Actions.Shops.setFiltersSucceeded(data));
        dispatch(Actions.Analytics.setShopContext());
      })
      .catch((error) => dispatch(Actions.Shops.setFiltersFailed(error.error)));
  }
  return reduction
    .setIn(['shopView', 'filters'], fromJS(filters));
}

function* setOrUpdateFiltersSucceeded(reduction, data) {
  return processFilteredData(reduction, data);
}

function* toggleFilter(reduction, filterToToggle) {
  const currentFilters = reduction.getIn(['shopView', 'filters']).toJS();
  const { type, filter } = filterToToggle;
  if (_.isEmpty(currentFilters[type])) { currentFilters[type] = {}; }
  if (_.isArray(filter.value)) {
    _.each(filter.value, value => { currentFilters[type][value] = !currentFilters[type][value]; });
  } else {
    currentFilters[type][filter.filter] = !currentFilters[type][filter.filter];
  }

  const filters = { ...currentFilters, offset: 0 };
  yield (dispatch) => dispatch(Actions.Shops.setFilters(filters));

  return reduction.setIn(['shopView', 'selectedProducts'], initialState.getIn(['shopView', 'selectedProducts']));
}

function* toggleExpanded(reduction, goupToToggle) {
  return reduction.updateIn(['shopView', 'expandedGroups', goupToToggle], value => !value);
}

function* toggleProduct(reduction, productId) {
  return utils.toggleProduct(reduction, ['shopView'], productId);
}

function* toggleAllVisibleProducts(reduction) {
  return utils.toggleAllVisibleProducts(reduction, ['shopView']);
}

function* toggleAllProducts(reduction) {
  // get selectedAll checkbox
  const selectedAll = reduction.getIn(['shopView', 'selectedProducts', 'selectedAll']);

  // should we select all?
  if (!selectedAll) {
    const shopId = reduction.getIn(['shopView', 'shopId']);

    const filters = reduction.getIn(['shopView', 'filters']).toJS();
    filters.limit = null;
    filters.offset = null;
    // make api call to get all products
    yield (dispatch) => APICall({method: 'put', url: `/shops/${shopId}/products/search`, payload: { ...flattenFilters(filters), options: ['products'], fields: ['id'] } })
      .then(response => dispatch(Actions.Shops.toggleAllProductsSucceeded(response.products)), error => dispatch(Actions.Shops.toggleAllProductsFailed(error)));
    return reduction;
  } else {
    // no, just clear selected flag
    const selectedProducts = new Map({
      selected: 0,
      selectedAll: false,
      selectedAllVisible: false
    });
    const updatedProducts = reduction
      .getIn(['shopView', 'products'], new List())
      .map(product => product.set('selected', false));
    return reduction
      .setIn(['shopView', 'selectedProducts'], selectedProducts)
      .setIn(['shopView', 'products'], updatedProducts);
  }
}

function* toggleAllProductsSucceeded(reduction, products) {
  const selectedProducts = _.reduce(products, (result, productId) => result.set(String(productId), true), new Map())
    .set('selected', products.length)
    .set('selectedAll', true)
    .set('selectedAllVisible', true);
  const updatedProducts = reduction
    .getIn(['shopView', 'products'])
    .map(product => product.set('selected', true));

  return reduction
    .setIn(['shopView', 'selectedProducts'], selectedProducts)
    .setIn(['shopView', 'products'], updatedProducts);
}

function* editProducts(reduction) {
  // prepare data for Bulk Edit view
  const shopId = reduction.getIn(['shopView', 'shopId']);
  const channelId = reduction.getIn(['shopView', 'channelId']);
  const selectedProducts = reduction.getIn(['shopView', 'selectedProducts']).toJS();
  const productIds = _(selectedProducts).map((value, key) => value && !_.isNaN(parseInt(key, 10)) && key).filter(value => !!value).value();
  const productsTotal = productIds.length;
  // create initial selection
  const bulkEditSelectedProducts = _.reduce(productIds, (map, productId) => map.set(String(productId), true), new Map({ selected: productsTotal }));
  // set products and shopId in Edit store
  yield dispatch => dispatch(Actions.Shops.editProductsStarted({ productIds, shopId, channelId, bulkEditSelectedProducts, productsTotal }));
    // navigate to Bulk Edit view
  yield dispatch => dispatch(Actions.Application.changeRoute(`/edit/${CHANNEL_NAMES[channelId]}`));
  return reduction;
}

function* editProductsStarted(reduction, data) {
  return reduction
    .setIn(['edit', 'productIds'], fromJS(data.productIds))
    .setIn(['edit', 'shopId'], fromJS(data.shopId))
    .setIn(['edit', 'channelId'], fromJS(data.channelId))
    .setIn(['edit', 'selectedProducts'], data.bulkEditSelectedProducts)
    .setIn(['edit', 'productsTotal'], fromJS(data.productsTotal));
}

function* clearTableBodyScrollPosition(reduction) {
  const tableScroll = reduction.getIn(['shopView', 'tableScroll']);
  if (!tableScroll) { return reduction; }

  return reduction.deleteIn(['shopView', 'tableScroll']);
}

// compose shops reducers
Reducers.add(new Reducer('Shops')
  .add(ACTION_CONSTANTS.SHOPS.SET_SHOP_ID, setShopId)

  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_DROPDOWN, toggleDropdown)
  .add(ACTION_CONSTANTS.SHOPS.NAVIGATE_TO_SHOP, navigateToShop)

  .add(ACTION_CONSTANTS.SHOPS.CLOSE_INTRO_VIDEO_MODAL, closeIntroVideoModal)

  .add(ACTION_CONSTANTS.SHOPS.CLOSE_SYNC_STATUS_MODAL, closeSyncStatusModal)
  .add(ACTION_CONSTANTS.SHOPS.OPEN_SYNC_STATUS_MODAL, openSyncStatusModal)

  .add(ACTION_CONSTANTS.SHOPS.PREVIOUS_PRODUCTS, previousProducts)
  .add(ACTION_CONSTANTS.SHOPS.NEXT_PRODUCTS, nextProducts)

  .add(ACTION_CONSTANTS.SHOPS.SET_MAIN_FILTERS, setMainFilters)
  .add(ACTION_CONSTANTS.SHOPS.SET_FILTERS, setFilters)
  .add(ACTION_CONSTANTS.SHOPS.SET_FILTERS_SUCCEEDED, setOrUpdateFiltersSucceeded)
  .add(ACTION_CONSTANTS.SHOPS.SET_FILTERS_FAILED, handleFailedActions)
  .add(ACTION_CONSTANTS.SHOPS.UPDATE_FILTERS, updateFilters)
  .add(ACTION_CONSTANTS.SHOPS.UPDATE_FILTERS_SUCCEEDED, setOrUpdateFiltersSucceeded)
  .add(ACTION_CONSTANTS.SHOPS.UPDATE_FILTERS_FAILED, handleFailedActions)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_FILTER, toggleFilter)
  .add(ACTION_CONSTANTS.SHOPS.SET_MAGIC_OPTIONS, setMagicOptions)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_EXPANDED, toggleExpanded)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_PRODUCT, toggleProduct)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_ALL_VISIBLE_PRODUCTS, toggleAllVisibleProducts)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_ALL_PRODUCTS, toggleAllProducts)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_ALL_PRODUCTS_SUCCEEDED, toggleAllProductsSucceeded)
  .add(ACTION_CONSTANTS.SHOPS.TOGGLE_ALL_PRODUCTS_FAILED, handleFailedActions)
  .add(ACTION_CONSTANTS.SHOPS.EDIT_PRODUCTS, editProducts)
  .add(ACTION_CONSTANTS.SHOPS.EDIT_PRODUCTS_STARTED, editProductsStarted)

  .add(ACTION_CONSTANTS.SHOPS.CLEAR_TABLE_BODY_SCROLL_POSITION, clearTableBodyScrollPosition));
