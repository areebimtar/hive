import { fromJS } from 'immutable';

import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import { APICall } from 'shared/utils/api';
import initialState from '../initialState';
import { getErrorString, showToast } from '../utils';

function getShopId(reduction) {
  return reduction.getIn(['reassignShop', 'shop', 'id']);
}

function* init(reduction, shop) {
  return reduction.set('reassignShop', initialState.get('reassignShop'))
    .setIn(['reassignShop', 'shop'], fromJS(shop));
}

function* onSearchQueryChanged(reduction, query) {
  yield dispatch => dispatch(Actions.ReassignShop.startLoading());
  return reduction.setIn(['reassignShop', 'searchQuery'], query);
}

function* searchUsers(reduction, query) {
  yield dispatch => APICall({
    method: 'get',
    url: '/admin/users/search',
    params: { query }
  }).then(searchResult => {
    const shop = reduction.getIn(['reassignShop', 'shop']).toJS();
    const shopCompanyId = shop.accountsById[shop.account_id].company_id;
    return searchResult.filter(user => user.company_id !== shopCompanyId);
  }).then(filteredSearchResult => {
    dispatch(Actions.ReassignShop.searchUsersSucceeded(filteredSearchResult));
  }).catch(error => {
    dispatch(Actions.ReassignShop.searchUsersFailed(getErrorString(error)));
  });
  return reduction.setIn(['reassignShop', 'lastUsedSearchQuery'], query);
}

function* searchUsersSucceeded(reduction, searchResult) {
  yield dispatch => dispatch(Actions.ReassignShop.endLoading());
  return reduction.setIn(['reassignShop', 'searchResult'], fromJS(searchResult))
    .deleteIn(['reassignShop', 'error']);
}

function* searchUsersFailed(reduction, error) {
  yield dispatch => dispatch(Actions.ReassignShop.endLoading());
  return reduction.setIn(['reassignShop', 'error'], error.toString());
}

function* startLoading(reduction) {
  return reduction.setIn(['reassignShop', 'loading'], true);
}

function* endLoading(reduction) {
  return reduction.setIn(['reassignShop', 'loading'], false);
}

function* selectUser(reduction, userId) {
  const users = reduction.getIn(['reassignShop', 'searchResult']).toJS();
  const selectedUser = users.filter(user => user.id === userId)[0];
  return reduction.setIn(['reassignShop', 'selectedUser'], fromJS(selectedUser));
}

function* reassignShop(reduction) {
  const shopId = getShopId(reduction);
  const userId = reduction.getIn(['reassignShop', 'selectedUser', 'id']);
  yield dispatch => APICall({
    method: 'get',
    url: `/admin/shops/${shopId}/reassign/${userId}`
  }).then(() => {
    dispatch(Actions.ReassignShop.reassignShopSucceeded());
  }).catch(() => {
    dispatch(Actions.ReassignShop.reassignShopFailed());
  });
  return reduction;
}

function* reassignShopSucceeded(reduction) {
  const shopId = getShopId(reduction);
  yield dispatch => dispatch(Actions.ShopDetail.getShopDetail(shopId));
  return reduction;
}

function* reassignShopFailed(reduction) {
  yield () => showToast('Error: could not reassign shop');
  return reduction;
}

// register reducers
Reducers.add(new Reducer('ReassignShop')
  .add(CONSTANTS.REASSIGNSHOP.INIT, init)
  .add(CONSTANTS.REASSIGNSHOP.ON_SEARCH_QUERY_CHANGED, onSearchQueryChanged)
  .add(CONSTANTS.REASSIGNSHOP.SEARCH_USERS, searchUsers)
  .add(CONSTANTS.REASSIGNSHOP.SEARCH_USERS_SUCCEEDED, searchUsersSucceeded)
  .add(CONSTANTS.REASSIGNSHOP.SEARCH_USERS_FAILED, searchUsersFailed)
  .add(CONSTANTS.REASSIGNSHOP.START_LOADING, startLoading)
  .add(CONSTANTS.REASSIGNSHOP.END_LOADING, endLoading)
  .add(CONSTANTS.REASSIGNSHOP.SELECT_USER, selectUser)
  .add(CONSTANTS.REASSIGNSHOP.REASSIGN_SHOP, reassignShop)
  .add(CONSTANTS.REASSIGNSHOP.REASSIGN_SHOP_SUCCEEDED, reassignShopSucceeded)
  .add(CONSTANTS.REASSIGNSHOP.REASSIGN_SHOP_FAILED, reassignShopFailed));
