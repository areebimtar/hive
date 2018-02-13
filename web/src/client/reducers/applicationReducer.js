import _ from 'lodash';
import { fromJS } from 'immutable';
import Promise from 'bluebird';
import moment from 'moment';
import { browserHistory } from 'react-router';
import Reducers, { Reducer } from '../Reducer';
import * as Actions from '../actions';
import CONSTANTS from '../constants/actions';
import { APICall } from 'shared/utils/api';
import { isBoolOrBoolString, toBoolString } from 'global/modules/utils/boolString';
import { SHOP_SYNC_STATUS_INITIAL_SYNC, SHOP_SYNC_STATUS_SYNC, SHOP_SYNC_STATUS_UPTODATE, SHOP_SYNC_STATUS_INCOMPLETE } from 'global/db/models/constants';
import { SHOPS_POLL_INTERVAL_SHORT, SHOPS_POLL_INTERVAL_LONG } from '../constants';

function* failHandler(reduction, error) {
  return reduction
    .updateIn(['notifications', 'errors'], errors => { errors.push(error); return errors; });
}

function* bootstrapApplication(reduction) {
  yield dispatch => APICall({method: 'get', url: '/config' })
    .then((config) => dispatch(Actions.Application.bootstrapSucceeded(config)),
      error => dispatch(Actions.Application.bootstrapFailed(error)));

  return reduction;
}

function *bootstrapSucceeded(reduction, data) {
  yield dispatch => dispatch(Actions.Analytics.initConfig(data));

  yield (dispatch) => dispatch(Actions.Application.handleShopImport());
  yield dispatch => dispatch(Actions.Application.rescheduleShopsPoll());

  yield dispatch => dispatch(Actions.Application.getIntercomProfile());

  return reduction.set('config', fromJS(data));
}

function* setShopsAndNavigate(reduction, data) {
  if (!(data && data.shops)) { return reduction; }

  yield dispatch => dispatch(Actions.Application.getShopsSucceeded(data.shops));
  yield dispatch => dispatch(Actions.Application.navigateToShop(data.shopId));

  return reduction.mergeIn(['shops'], fromJS(data.shops));
}

function* handleShopImport(reduction) {
  yield (dispatch) => Promise.all([
    APICall({method: 'get', url: '/shops', params: {denorm: true}}),
    APICall({method: 'get', url: '/users'})
  ]).spread((shops, profile) => {
    let action;
    if (!shops || !_.isArray(shops.shops) || !shops.shops.length) {
      action = Actions.Application.changeRoute('/welcome');
    } else if (profile && profile.last_seen_shop) {
      const shopId = profile.last_seen_shop.id;
      action = Actions.Application.setShopsAndNavigate({shops, shopId});
    } else {
      action = Actions.Application.setShopsAndNavigate({shops});
    }

    dispatch(Actions.Application.setProfile(profile));
    dispatch(Actions.Shops.setMagicOptions());
    dispatch(action);
  }).catch(() => dispatch(Actions.Application.changeRoute('/')));

  return reduction;
}

function* setIntervalId(reduction, intervalId) {
  return reduction.setIn(['shopsPolling', 'intervalId'], intervalId);
}

function getCurrentPollingInterval(reduction) {
  const longInterval = reduction.getIn(['config', 'shopsPollingIntervalLong'], SHOPS_POLL_INTERVAL_LONG);
  return reduction.getIn(['shopsPolling', 'interval'], longInterval);
}

function getPollingInterval(reduction, shop) {
  const shortStatuses = [SHOP_SYNC_STATUS_INITIAL_SYNC, SHOP_SYNC_STATUS_SYNC, null];
  const shopStatus = _.get(shop, 'sync_status');
  const inSync = shortStatuses.indexOf(shopStatus) !== -1;
  const inApply = _.get(shop, 'applying_operations', false) || reduction.getIn(['edit', 'applyOperationsInProgress'], false);
  const inSyncWait = reduction.getIn(['edit', 'pendingUpdatesInProgress'], false);
  const isValid = !!_.get(shop, 'id', null);

  const longInterval = reduction.getIn(['config', 'shopsPollingIntervalLong'], SHOPS_POLL_INTERVAL_LONG);
  const shortInterval = reduction.getIn(['config', 'shopsPollingIntervalShort'], SHOPS_POLL_INTERVAL_SHORT);

  return (inSyncWait || inSync || inApply || !isValid) ? shortInterval : longInterval;
}

function* rescheduleShopsPoll(reduction, interval) {
  // Cancel the currently running poll interval
  const currentIntervalId = reduction.getIn(['shopsPolling', 'intervalId']);
  if (currentIntervalId) {
    clearInterval(currentIntervalId);
  }

  // check if new interval is different. if so, do nothing
  const currentShop = reduction.getIn(['shops', 'current']);
  const pollingInterval = getCurrentPollingInterval(reduction);
  const newPollInterval = interval || getPollingInterval(reduction, currentShop);
  if (interval === pollingInterval) { return reduction; }

  // Schedule the new interval
  yield dispatch => {
    const newIntervalId = setInterval(() => dispatch(Actions.Application.getShops()), newPollInterval);
    dispatch(Actions.Application.setIntervalId(newIntervalId));
  };

  return reduction
    .setIn(['shopsPolling', 'interval'], newPollInterval);
}

function* setProfile(reduction, profile) {
  return reduction.setIn(['userProfile'], fromJS(profile));
}

function* getIntercomProfile(reduction) {
  yield (dispatch) => APICall({method: 'get', url: '/users/jwtdata'}).then(
    (response) => {
      dispatch(Actions.Application.getIntercomProfileSucceeded(response));
      dispatch(Actions.Analytics.updateUserInfo(response));
      dispatch(Actions.Analytics.setAppInfo());
      dispatch(Actions.Analytics.trackEvent({ event: 'app-loaded' }));
    },
    (error) => dispatch(Actions.Application.getIntercomProfileFailed(error.error)));

  return reduction;
}

function* getIntercomProfileSucceeded(reduction, data) {
  return reduction.setIn(['intercom'], data);
}

function* getShops(reduction) {
  yield (dispatch) => APICall({method: 'get', url: '/shops', params: {denorm: true}}).then(
    (response) => dispatch(Actions.Application.getShopsSucceeded(response)),
    (error) => dispatch(Actions.Application.getShopsFailed(error.error)));

  return reduction;
}

function setupOptions(reduction) {
  const data = reduction.getIn(['shops']).toJS();
  if (!(data && data.shops && data.shops.length)) { return reduction; }

  const shopId = data.current && data.current.id;

  const dropdownOptions = _.chain(data.shops || [])
    .map(id => data.shopsById[id])
    .map(shop => { shop.channel = data.channelsById[shop.channel_id].name; shop._selected = shop.id === shopId; return shop; })
    .value()
    .sort((left, right) => {
      const sortRes = left.channel.localeCompare(right.channel);
      if ( sortRes === 0 ) { return left.name.localeCompare(right.name); }
      return sortRes;
    });

  return reduction
    .setIn(['shops', 'options'], fromJS(dropdownOptions));
}

function getShopPath(reduction, currentShop) {
  const shopId = currentShop.id;
  const channelId = reduction.getIn(['shops', 'shopsById', shopId, 'channel_id']);
  const channel = reduction.getIn(['shops', 'channelsById', channelId, 'name']);

  if (!shopId || !channel) { return '/'; }
  return `/${channel}/${shopId}`.toLowerCase();
}

function isApplyProgressModalShown(reduction) {
  return reduction.getIn(['edit', 'applyProgressModal', 'shown']);
}

function shouldClearSyncFlag(newShopData, currentShopData) {
  if (!newShopData.sync_status) { return false; }

  const isStatusSynced = newShopData.sync_status === SHOP_SYNC_STATUS_UPTODATE || newShopData.sync_status === SHOP_SYNC_STATUS_INCOMPLETE;
  const hasNoProductsToUpload = newShopData.to_upload === 0;
  const changesSynced = currentShopData && moment(newShopData.last_sync_timestamp).isAfter(moment(currentShopData.get('last_sync_timestamp')));

  return isStatusSynced && hasNoProductsToUpload && changesSynced;
}

function* getShopsSucceeded(reduction, data) {
  if (!data) { return reduction; }

  const shops = reduction.get('shops').toJS();
  if (shops.options) { delete shops.options; }
  if (shops.current) { delete shops.current; }

  const currentShop = reduction.getIn(['shops', 'current']);
  const currentShopInvalid = currentShop && currentShop.get('invalid');
  const shopId = currentShop && currentShop.get('id');
  data.current = data.shopsById[shopId] || {id: shopId};
  const applyOperationsInProgress = reduction.getIn(['edit', 'applyOperationsInProgress']);

  const pollingInterval = getCurrentPollingInterval(reduction);
  const newPollInterval = getPollingInterval(reduction, data.current);
  if (newPollInterval !== pollingInterval) {
    yield dispatch => dispatch(Actions.Application.rescheduleShopsPoll(newPollInterval));
  }

  if (_.get(data, 'current.applying_operations', false) || applyOperationsInProgress) {
    if (!isApplyProgressModalShown(reduction)) {
      // Show apply progress modal if apply ops are running and it's not shown
      // This can happen when user reloads the app and apply ops are still running
      yield dispatch => dispatch(Actions.BulkEdit.setApplyProgressModalShown(true));
    }
    const progress = data.current.applied;
    const total = data.current.to_apply;
    yield dispatch => dispatch(Actions.BulkEdit.setApplyProgressModalProgress({ progress, total }));
  } else if (isApplyProgressModalShown(reduction)) {
    // Current shop is up-to-date and apply progress modal is show, hide it
    yield dispatch => dispatch(Actions.BulkEdit.setApplyProgressModalShown(false));
  }

  if (data.current.invalid && data.current.invalid !== currentShopInvalid) {
    yield dispatch => dispatch(Actions.Application.clearSyncFlag());
    yield dispatch => dispatch(Actions.Shops.openSyncStatusModal(false));
    yield dispatch => dispatch(Actions.Application.changeRoute(getShopPath(reduction, data.current)));

    return setupOptions(reduction.setIn(['shops'], fromJS(data)));
  }

  if (shouldClearSyncFlag(data.current, currentShop)) {
    yield dispatch => dispatch(Actions.Application.clearSyncFlag());
  }

  // after initial sync is done, load all products based on clean set of filters
  if ((currentShop && currentShop.get('sync_status') === SHOP_SYNC_STATUS_INITIAL_SYNC) && (data.current.sync_status !== SHOP_SYNC_STATUS_INITIAL_SYNC )) {
    yield dispatch => dispatch(Actions.Shops.setFilters());
  }

  return setupOptions(reduction
    .setIn(['shops'], fromJS(data))
    .setIn(['shops', 'current'], fromJS(data.current)));
}

// set shop
function* setShopId(reduction, shopId) {
  if (!shopId) { return reduction; }

  const shop = reduction.getIn(['shops', 'shopsById', String(shopId)]);
  const newReduction = (shop) ? reduction.setIn(['shops', 'current'], shop) : reduction.setIn(['shops', 'current'], fromJS({id: shopId}));

  return setupOptions(newReduction);
}

function* changeRoute(reduction, route) {
  yield dispatch => dispatch(Actions.Application.changeRouteStarted(route));
  yield (dispatch) => setTimeout(() => {
    browserHistory.push(route);
    dispatch(Actions.Application.changeRouteSucceeded(route));
  }, 1);
  return reduction;
}

function* navigateToShop(reduction, shopId) {
  const shop = reduction.getIn(['shops', 'shopsById', String(shopId)]);
  const buildUrl = (channelID, shopID) => {
    const channel = reduction.getIn(['shops', 'channelsById', channelID, 'name']);
    return `/${channel}/${shopID}`;
  };

  let route;
  if (shop && shop.has('channel_id')) {
    route = buildUrl(shop.get('channel_id'), shopId);
  } else {
    const shops = reduction.getIn(['shops', 'shops']);
    const firstShopId = shops && shops.first();
    const firstShop = reduction.getIn(['shops', 'shopsById', String(firstShopId)]);
    if (firstShop && firstShop.has('channel_id')) {
      route = buildUrl(firstShop.get('channel_id'), firstShopId);
    }
  }

  if (route) {
    yield dispatch => dispatch(Actions.Application.changeRoute(route));
  }

  return reduction;
}

function clearPendingUpdatesTimer(reduction) {
  const savedId = reduction.getIn(['edit', 'pendingUpdatesInProgressClearId']);
  clearTimeout(savedId);
}

function* clearSyncFlag(reduction) {
  clearPendingUpdatesTimer(reduction);
  return reduction
    .deleteIn(['edit', 'pendingUpdatesInProgressClearId'])
    .setIn(['edit', 'pendingUpdatesInProgress'], false);
}

function* setSyncFlagTimeoutId(reduction, id) {
  clearPendingUpdatesTimer(reduction);
  return reduction.setIn(['edit', 'pendingUpdatesInProgressClearId'], id);
}

// simple setTimeout wrapper added because of unit testing
function mySetTimeout(f, d) {
  return setTimeout(f, d);
}

function* scheduleSyncFlagClearing(reduction) {
  // Wait for five minutes before hiding 'Syncing...' if we don't get update from server
  const DELAY = 5 * 60 * 1000;
  yield dispatch => {
    const timeoutId = mySetTimeout(() => dispatch(Actions.Application.clearSyncFlag()), DELAY);
    dispatch(Actions.Application.setSyncFlagTimeoutId(timeoutId));
  };
  return reduction;
}

function* navigateToUrl(reduction, url) {
  window.location = url;
  return reduction;
}

function* setBooleanProfileValue(reduction, data) {
  const key = _.get(data, 'name');
  const value = _.get(data, 'value');

  if (!isBoolOrBoolString(value)) {
    return reduction;
  }

  APICall({ method: 'put', url: '/users', payload: { [key]: toBoolString(value) }});
  yield (dispatch) => dispatch(Actions.Shops.setMagicOptions());
  return reduction.setIn(['userProfile', key], toBoolString(value));
}

// register reducers
Reducers.add(new Reducer('Application')
  .add(CONSTANTS.APPLICATION.BOOTSTRAP, bootstrapApplication)
  .add(CONSTANTS.APPLICATION.BOOTSTRAP_SUCCEEDED, bootstrapSucceeded)
  .add(CONSTANTS.APPLICATION.BOOTSTRAP_FAILED, failHandler)
  .add(CONSTANTS.APPLICATION.HANDLE_SHOP_IMPORT, handleShopImport)
  .add(CONSTANTS.APPLICATION.SET_SHOPS_AND_NAVIGATE, setShopsAndNavigate)
  .add(CONSTANTS.APPLICATION.CHANGE_ROUTE, changeRoute)
  .add(CONSTANTS.APPLICATION.RESCHEDULE_SHOPS_POLL, rescheduleShopsPoll)
  .add(CONSTANTS.APPLICATION.SET_INTERVAL_ID, setIntervalId)
  .add(CONSTANTS.APPLICATION.GET_INTERCOM_PROFILE, getIntercomProfile)
  .add(CONSTANTS.APPLICATION.GET_INTERCOM_PROFILE_SUCCEEDED, getIntercomProfileSucceeded)
  .add(CONSTANTS.APPLICATION.GET_INTERCOM_PROFILE_FAILED, failHandler)
  .add(CONSTANTS.APPLICATION.GET_SHOPS, getShops)
  .add(CONSTANTS.APPLICATION.GET_SHOPS_SUCCEEDED, getShopsSucceeded)
  .add(CONSTANTS.APPLICATION.GET_SHOPS_FAILED, failHandler)
  .add(CONSTANTS.APPLICATION.SET_SHOP_ID, setShopId)
  .add(CONSTANTS.APPLICATION.CLEAR_SYNC_FLAG, clearSyncFlag)
  .add(CONSTANTS.APPLICATION.SET_SYNC_FLAG_TIMEOUT_ID, setSyncFlagTimeoutId)
  .add(CONSTANTS.APPLICATION.SET_PROFILE, setProfile)
  .add(CONSTANTS.APPLICATION.SCHEDULE_SYNC_FLAG_CLEARING, scheduleSyncFlagClearing)
  .add(CONSTANTS.APPLICATION.NAVIGATE_TO_SHOP, navigateToShop)
  .add(CONSTANTS.APPLICATION.NAVIGATE_TO_URL, navigateToUrl)
  .add(CONSTANTS.APPLICATION.SET_BOOLEAN_PROFILE_VALUE, setBooleanProfileValue));
