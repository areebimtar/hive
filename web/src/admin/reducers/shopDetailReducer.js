import { fromJS } from 'immutable';
import Promise from 'bluebird';
import { browserHistory } from 'react-router';
import moment from 'moment';

import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import { APICall } from 'shared/utils/api';
import initialState from '../initialState';
import { getErrorString, showToast } from '../utils';

const DEFAULT_LAST_SYNC_TIMESTAMP = '1998-12-31T23:00:00.000Z';

function getShopId(reduction) {
  return reduction.getIn(['shopDetail', 'shop', 'id']);
}

function* getShopDetail(reduction, shopId) {
  const shopDataPromise = APICall({
    method: 'get',
    url: `/admin/shops/${shopId}`,
    params: {
      denorm: true
    }
  });
  const shopOwnersPromise = APICall({
    method: 'get',
    url: `/admin/shops/${shopId}/owners`
  });
  const shopProductsPromise = APICall({
    method: 'get',
    url: `/admin/shops/${shopId}/products/search`
  });
  yield dispatch => Promise.all([shopDataPromise, shopOwnersPromise, shopProductsPromise])
    .spread((shop, owners, products) =>
      dispatch(Actions.ShopDetail.getShopDetailSucceeded({ shop, owners, products })))
    .catch(error =>
      dispatch(Actions.ShopDetail.getShopDetailFailed(getErrorString(error))));
  return reduction.setIn(['shopDetail', 'loading'], true);
}

function* getShopDetailSucceeded(reduction, { shop, owners, products }) {
  return reduction.setIn(['shopDetail', 'loading'], false)
    .setIn(['shopDetail', 'shop'], fromJS(shop))
    .setIn(['shopDetail', 'owners'], fromJS(owners))
    .setIn(['shopDetail', 'productsStateCounts'], fromJS(products.stateCounts));
}

function* getShopDetailFailed(reduction, error) {
  return reduction.setIn(['shopDetail', 'loading'], false)
    .setIn(['shopDetail', 'error'], error.toString());
}

function* clearShopDetail(reduction) {
  return reduction.set('shopDetail', initialState.get('shopDetail'));
}

function* syncShop(reduction) {
  const shopId = getShopId(reduction);
  yield dispatch => APICall({
    method: 'get',
    url: `/admin/shops/${shopId}/sync`
  }).then(() => dispatch(Actions.ShopDetail.syncShopSucceeded()))
    .catch(err => dispatch(Actions.ShopDetail.syncShopFailed(err)));
  return reduction.setIn(['shopDetail', 'syncStart'], moment().toISOString())
    .setIn(['shopDetail', 'syncInProgress'], true);
}

function* syncShopSucceeded(reduction) {
  yield dispatch => dispatch(Actions.ShopDetail.scheduleShopDetailPoll());
  return reduction;
}

function* syncShopFailed(reduction, response) {
  if (response.status === 400) {
    yield () => showToast('Error: could not duplicate sync shop', 6000);
  } else {
    yield () => showToast('Error: could not sync shop');
  }
  return reduction.setIn(['shopDetail', 'syncInProgress'], false);
}

function* deleteShop(reduction) {
  const shopId = getShopId(reduction);
  yield dispatch => APICall({
    method: 'delete',
    url: `/admin/shops/${shopId}`
  }).then(() => dispatch(Actions.ShopDetail.deleteShopSucceeded()))
    .catch(() => dispatch(Actions.ShopDetail.deleteShopFailed()));
  return reduction;
}

function* deleteShopSucceeded(reduction) {
  browserHistory.goBack();
  return reduction;
}

function* deleteShopFailed(reduction) {
  yield () => showToast('Error: could not sync delete shop');
  return reduction;
}

function* scheduleShopDetailPoll(reduction) {
  yield dispatch => setTimeout(() => dispatch(Actions.ShopDetail.pollShopDetail()), 2000);
  return reduction;
}

function* pollShopDetail(reduction) {
  const shopId = getShopId(reduction);
  yield dispatch => APICall({
    method: 'get',
    url: `/admin/shops/${shopId}`
  }).then(shop => {
    const currentShopLastSyncTimestamp = moment(shop.last_sync_timestamp);
    const syncStart = moment(reduction.getIn(['shopDetail', 'syncStart']));
    if (DEFAULT_LAST_SYNC_TIMESTAMP === shop.last_sync_timestamp
      || currentShopLastSyncTimestamp.isAfter(syncStart)) {
      dispatch(Actions.ShopDetail.pollShopDetailSucceeded());
    } else {
      dispatch(Actions.ShopDetail.scheduleShopDetailPoll());
    }
  }).catch(() => dispatch(Actions.ShopDetail.pollShopDetailFailed()));
  return reduction;
}

function* pollShopDetailSucceeded(reduction) {
  const shopId = getShopId(reduction);
  yield dispatch => dispatch(Actions.ShopDetail.getShopDetail(shopId));
  return reduction.deleteIn(['shopDetail', 'syncStart'])
    .setIn(['shopDetail', 'syncInProgress'], false);
}

function* pollShopDetailFailed(reduction) {
  return reduction.deleteIn(['shopDetail', 'syncStart'])
    .setIn(['shopDetail', 'syncInProgress'], false);
}

// register reducers
Reducers.add(new Reducer('ShopDetail')
  .add(CONSTANTS.SHOPDETAIL.GET_SHOP_DETAIL, getShopDetail)
  .add(CONSTANTS.SHOPDETAIL.GET_SHOP_DETAIL_SUCCEEDED, getShopDetailSucceeded)
  .add(CONSTANTS.SHOPDETAIL.GET_SHOP_DETAIL_FAILED, getShopDetailFailed)
  .add(CONSTANTS.SHOPDETAIL.CLEAR_SHOP_DETAIL, clearShopDetail)
  .add(CONSTANTS.SHOPDETAIL.SYNC_SHOP, syncShop)
  .add(CONSTANTS.SHOPDETAIL.SYNC_SHOP_SUCCEEDED, syncShopSucceeded)
  .add(CONSTANTS.SHOPDETAIL.SYNC_SHOP_FAILED, syncShopFailed)
  .add(CONSTANTS.SHOPDETAIL.DELETE_SHOP, deleteShop)
  .add(CONSTANTS.SHOPDETAIL.DELETE_SHOP_SUCCEEDED, deleteShopSucceeded)
  .add(CONSTANTS.SHOPDETAIL.DELETE_SHOP_FAILED, deleteShopFailed)
  .add(CONSTANTS.SHOPDETAIL.SCHEDULE_SHOP_DETAIL_POLL, scheduleShopDetailPoll)
  .add(CONSTANTS.SHOPDETAIL.POLL_SHOP_DETAIL, pollShopDetail)
  .add(CONSTANTS.SHOPDETAIL.POLL_SHOP_DETAIL_SUCCEEDED, pollShopDetailSucceeded)
  .add(CONSTANTS.SHOPDETAIL.POLL_SHOP_DETAIL_FAILED, pollShopDetailFailed));
