import { fromJS } from 'immutable';
import { browserHistory } from 'react-router';

import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import { APICall } from 'shared/utils/api';
import initialState from '../initialState';
import { getErrorString, getUrlQueryParam } from '../utils';

function* init(reduction) {
  const query = getUrlQueryParam(reduction, 'query');
  if (query && query.length) {
    yield dispatch => dispatch(Actions.ShopsLookup.onSearchQueryChanged(query));
    yield dispatch => dispatch(Actions.ShopsLookup.searchShops(query));
  }
  return reduction.set('shopsLookup', initialState.get('shopsLookup'));
}

function* onSearchQueryCleared(reduction) {
  return reduction.setIn(['shopsLookup', 'searchQuery'], '')
    .setIn(['shopsLookup', 'searchResult'], fromJS([]))
    .deleteIn(['shopsLookup', 'lastUsedSearchQuery']);
}

function* onSearchQueryChanged(reduction, query) {
  yield dispatch => dispatch(Actions.ShopsLookup.startLoading());
  return reduction.setIn(['shopsLookup', 'searchQuery'], query);
}

function* searchShops(reduction, query) {
  yield dispatch => APICall({
    method: 'get',
    url: '/admin/shops/search',
    params: { query }
  }).then(searchResult => {
    dispatch(Actions.ShopsLookup.searchShopsSucceeded(searchResult));
  }).catch(error => {
    dispatch(Actions.ShopsLookup.searchShopsFailed(getErrorString(error)));
  });
  return reduction.setIn(['shopsLookup', 'lastUsedSearchQuery'], query);
}

function* searchShopsSucceeded(reduction, searchResult) {
  yield dispatch => dispatch(Actions.ShopsLookup.endLoading());
  return reduction.setIn(['shopsLookup', 'searchResult'], fromJS(searchResult))
    .deleteIn(['shopsLookup', 'error']);
}

function* searchShopsFailed(reduction, error) {
  yield dispatch => dispatch(Actions.ShopsLookup.endLoading());
  return reduction.setIn(['shopsLookup', 'error'], error.toString());
}

function* openShopDetail(reduction, shopId) {
  // Replace URI in browser history with URI that contains
  // last search query as query parameter.
  // Used when user navigates away from lookup.
  // In case user navigates back the query from path is used to
  // show last search results.
  const query = reduction.getIn(['shopsLookup', 'searchQuery']);
  yield dispatch => setTimeout(() => {
    browserHistory.replace(`/admin/shops?query=${encodeURIComponent(query)}`);
    dispatch(Actions.Application.changeRoute(`/admin/shops/${shopId}`));
  }, 1);
  return reduction;
}

function* startLoading(reduction) {
  return reduction.setIn(['shopsLookup', 'loading'], true);
}

function* endLoading(reduction) {
  return reduction.setIn(['shopsLookup', 'loading'], false);
}

// register reducers
Reducers.add(new Reducer('ShopsLookup')
  .add(CONSTANTS.SHOPSLOOKUP.INIT, init)
  .add(CONSTANTS.SHOPSLOOKUP.ON_SEARCH_QUERY_CLEARED, onSearchQueryCleared)
  .add(CONSTANTS.SHOPSLOOKUP.ON_SEARCH_QUERY_CHANGED, onSearchQueryChanged)
  .add(CONSTANTS.SHOPSLOOKUP.SEARCH_SHOPS, searchShops)
  .add(CONSTANTS.SHOPSLOOKUP.SEARCH_SHOPS_SUCCEEDED, searchShopsSucceeded)
  .add(CONSTANTS.SHOPSLOOKUP.SEARCH_SHOPS_FAILED, searchShopsFailed)
  .add(CONSTANTS.SHOPSLOOKUP.OPEN_SHOP_DETAIL, openShopDetail)
  .add(CONSTANTS.SHOPSLOOKUP.START_LOADING, startLoading)
  .add(CONSTANTS.SHOPSLOOKUP.END_LOADING, endLoading));
