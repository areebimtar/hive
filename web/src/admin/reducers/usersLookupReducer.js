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
    yield dispatch => dispatch(Actions.UsersLookup.onSearchQueryChanged(query));
    yield dispatch => dispatch(Actions.UsersLookup.searchUsers(query));
  }
  return reduction.set('usersLookup', initialState.get('usersLookup'));
}

function* onSearchQueryCleared(reduction) {
  return reduction.setIn(['usersLookup', 'searchQuery'], '')
    .setIn(['usersLookup', 'searchResult'], fromJS([]))
    .deleteIn(['usersLookup', 'lastUsedSearchQuery']);
}

function* onSearchQueryChanged(reduction, query) {
  yield dispatch => dispatch(Actions.UsersLookup.startLoading());
  return reduction.setIn(['usersLookup', 'searchQuery'], query);
}

function* searchUsers(reduction, query) {
  yield dispatch => APICall({
    method: 'get',
    url: '/admin/users/search',
    params: { query }
  }).then(searchResult => {
    dispatch(Actions.UsersLookup.searchUsersSucceeded(searchResult));
  }).catch(error => {
    dispatch(Actions.UsersLookup.searchUsersFailed(getErrorString(error)));
  });
  return reduction.setIn(['usersLookup', 'lastUsedSearchQuery'], query);
}

function* searchUsersSucceeded(reduction, searchResult) {
  yield dispatch => dispatch(Actions.UsersLookup.endLoading());
  return reduction.setIn(['usersLookup', 'searchResult'], fromJS(searchResult))
    .deleteIn(['usersLookup', 'error']);
}

function* searchUsersFailed(reduction, error) {
  yield dispatch => dispatch(Actions.UsersLookup.endLoading());
  return reduction.setIn(['usersLookup', 'error'], error.toString());
}

function* openUserDetail(reduction, userId) {
  // Replace URI in browser history with URI that contains
  // last search query as query parameter.
  // Used when user navigates away from lookup.
  // In case she navigates back the query from path is used to
  // show last search results.
  const query = reduction.getIn(['usersLookup', 'searchQuery']);
  yield dispatch => setTimeout(() => {
    browserHistory.replace(`/admin/users?query=${encodeURIComponent(query)}`);
    dispatch(Actions.Application.changeRoute(`/admin/users/${userId}`));
  }, 1);
  return reduction;
}

function* startLoading(reduction) {
  return reduction.setIn(['usersLookup', 'loading'], true);
}

function* endLoading(reduction) {
  return reduction.setIn(['usersLookup', 'loading'], false);
}

// register reducers
Reducers.add(new Reducer('UsersLookup')
  .add(CONSTANTS.USERSLOOKUP.INIT, init)
  .add(CONSTANTS.USERSLOOKUP.ON_SEARCH_QUERY_CLEARED, onSearchQueryCleared)
  .add(CONSTANTS.USERSLOOKUP.ON_SEARCH_QUERY_CHANGED, onSearchQueryChanged)
  .add(CONSTANTS.USERSLOOKUP.SEARCH_USERS, searchUsers)
  .add(CONSTANTS.USERSLOOKUP.SEARCH_USERS_SUCCEEDED, searchUsersSucceeded)
  .add(CONSTANTS.USERSLOOKUP.SEARCH_USERS_FAILED, searchUsersFailed)
  .add(CONSTANTS.USERSLOOKUP.OPEN_USER_DETAIL, openUserDetail)
  .add(CONSTANTS.USERSLOOKUP.START_LOADING, startLoading)
  .add(CONSTANTS.USERSLOOKUP.END_LOADING, endLoading));
