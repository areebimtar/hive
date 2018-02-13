import { fromJS } from 'immutable';
import Promise from 'bluebird';

import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import { APICall } from 'shared/utils/api';
import initialState from '../initialState';
import { getErrorString, showToast } from '../utils';

function* getUserDetail(reduction, userId) {
  const userDataPromise = APICall({
    method: 'get',
    url: `/admin/users/${userId}`
  });
  const userShopsPromise = APICall({
    method: 'get',
    url: `/admin/users/${userId}/shops`
  });
  yield dispatch => Promise.all([userDataPromise, userShopsPromise])
    .spread((user, shops) =>
      dispatch(Actions.UserDetail.getUserDetailSucceeded({ user, shops })))
    .catch(error =>
      dispatch(Actions.UserDetail.getUserDetailFailed(getErrorString(error))));
  return reduction.setIn(['userDetail', 'loading'], true);
}

function* getUserDetailSucceeded(reduction, { user, shops }) {
  return reduction.setIn(['userDetail', 'loading'], false)
    .setIn(['userDetail', 'user'], fromJS(user))
    .setIn(['userDetail', 'shops'], fromJS(shops));
}

function* getUserDetailFailed(reduction, error) {
  return reduction.setIn(['userDetail', 'loading'], false)
    .setIn(['userDetail', 'error'], error.toString());
}

function* impersonateUser(reduction) {
  const userId = reduction.getIn(['userDetail', 'user', 'id']);
  yield dispatch => APICall({
    method: 'get',
    url: `/admin/impersonation/impersonate/${userId}`
  }).then(() =>
    dispatch(Actions.UserDetail.impersonateUserSucceeded()))
  .catch(err =>
    dispatch(Actions.UserDetail.impersonateUserFailed(err)));
  return reduction;
}

function* impersonateUserSucceeded(reduction) {
  yield dispatch => dispatch(Actions.Application.getImpersonation());
  return reduction;
}

function* impersonateUserFailed(reduction) {
  yield () => showToast('Error: could not impersonate user');
  return reduction;
}

function* clearUserDetail(reduction) {
  return reduction.set('userDetail', initialState.get('userDetail'));
}

// register reducers
Reducers.add(new Reducer('UserDetail')
  .add(CONSTANTS.USERDETAIL.GET_USER_DETAIL, getUserDetail)
  .add(CONSTANTS.USERDETAIL.GET_USER_DETAIL_SUCCEEDED, getUserDetailSucceeded)
  .add(CONSTANTS.USERDETAIL.GET_USER_DETAIL_FAILED, getUserDetailFailed)
  .add(CONSTANTS.USERDETAIL.IMPERSONATE_USER, impersonateUser)
  .add(CONSTANTS.USERDETAIL.IMPERSONATE_USER_SUCCEEDED, impersonateUserSucceeded)
  .add(CONSTANTS.USERDETAIL.IMPERSONATE_USER_FAILED, impersonateUserFailed)
  .add(CONSTANTS.USERDETAIL.CLEAR_USER_DETAIL, clearUserDetail));
