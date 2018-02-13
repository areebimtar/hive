import { fromJS } from 'immutable';
import { browserHistory } from 'react-router';

import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import { APICall } from 'shared/utils/api';

function* bootstrap(reduction) {
  yield dispatch => dispatch(Actions.Application.getUserInfo());
  yield dispatch => dispatch(Actions.Application.getImpersonation());
  return reduction;
}

function* getUserInfo(reduction) {
  yield dispatch => APICall({
    method: 'get',
    url: '/admin/userInfo'
  })
    .then(userInfo =>
      dispatch(Actions.Application.getUserInfoSucceeded(userInfo)));
  return reduction;
}

function* getUserInfoSucceeded(reduction, userInfo) {
  return reduction.set('userInfo', fromJS(userInfo));
}

function* downloadShopCounts(reduction) {
  yield dispatch => APICall({ method: 'get', url: '/admin/shops/counts' })
    .then(shopCounts =>
      dispatch(Actions.Application.downloadShopCountsSucceeded(shopCounts)));
  return reduction;
}

function* downloadShopCountsSucceeded(reduction, shopCounts) {
  return reduction.set('shopCounts', fromJS(shopCounts));
}

function* getImpersonation(reduction) {
  yield dispatch => APICall({
    method: 'get',
    url: '/admin/impersonation'
  })
    .then(impersonation =>
      dispatch(Actions.Application.getImpersonationSucceeded(impersonation)));
  return reduction;
}

function* getImpersonationSucceeded(reduction, impersonation) {
  return reduction.set('impersonation', fromJS(impersonation));
}

function* stopImpersonating(reduction) {
  yield dispatch => APICall({
    method: 'get',
    url: '/admin/impersonation/cancel'
  })
    .then(() =>
      dispatch(Actions.Application.stopImpersonatingSucceeded()));
  return reduction;
}

function* stopImpersonatingSucceeded(reduction) {
  yield dispatch => dispatch(Actions.Application.getImpersonation());
  return reduction;
}

function* changeRoute(reduction, route) {
  yield dispatch => dispatch(Actions.Application.changeRouteStarted(route));
  yield (dispatch) => setTimeout(() => {
    browserHistory.push(route);
    dispatch(Actions.Application.changeRouteSucceeded(route));
  }, 1);
  return reduction;
}

// register reducers
Reducers.add(new Reducer('Application')
  .add(CONSTANTS.APPLICATION.BOOTSTRAP, bootstrap)
  .add(CONSTANTS.APPLICATION.GET_USER_INFO, getUserInfo)
  .add(CONSTANTS.APPLICATION.GET_USER_INFO_SUCCEEDED, getUserInfoSucceeded)
  .add(CONSTANTS.APPLICATION.DOWNLOAD_SHOP_COUNTS, downloadShopCounts)
  .add(CONSTANTS.APPLICATION.DOWNLOAD_SHOP_COUNTS_SUCCEEDED, downloadShopCountsSucceeded)
  .add(CONSTANTS.APPLICATION.GET_IMPERSONATION, getImpersonation)
  .add(CONSTANTS.APPLICATION.GET_IMPERSONATION_SUCCEEDED, getImpersonationSucceeded)
  .add(CONSTANTS.APPLICATION.STOP_IMPERSONATING, stopImpersonating)
  .add(CONSTANTS.APPLICATION.STOP_IMPERSONATING_SUCCEEDED, stopImpersonatingSucceeded)
  .add(CONSTANTS.APPLICATION.CHANGE_ROUTE, changeRoute));
