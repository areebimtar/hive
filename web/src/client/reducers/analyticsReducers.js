import Reducers, { Reducer } from '../Reducer';
import CONSTANTS from '../constants/actions';
import * as mixpanel from '../utils/mixpanel';
import _ from 'lodash';

const analyticsStrategies = {
  mixpanel: mixpanel
};

function execAnalytics(functionName, ...args) {
  _.forEach(analyticsStrategies, (strategy, strategyName) => {
    const fn = _.get(strategy, functionName);
    if (!_.isFunction(fn)) {
      // unsupported operation for that analytics strategy
      return;
    }

    // make the calls in a try/catch because sometimes these libraries are flaky
    try {
      fn(...args);
    } catch (e) {
      console.error(`Could not make ${strategyName} call`, e);  // eslint-disable-line no-console
    }
  });
}

function* updateUserInfo(reduction, data) {
  execAnalytics('updateUserInfo', data);
  return reduction;
}

function* trackEvent(reduction, data) {
  const eventName = _.isString(data) ? data : _.get(data, 'event');
  if (eventName) {
    const eventPayload = _.isObject(data) ? data : undefined;
    if (eventPayload) {
      delete eventPayload.event;
    }
    execAnalytics('trackEvent', eventName, eventPayload);
  }
  return reduction;
}

function* setAppInfo(reduction) {
  const appData = { sha: 'UNKNOWN', version: 'UNKNOWN' };
  _.forEach(document.getElementsByTagName('meta'), (element) => {
    if (element.getAttribute('name') === 'GHCommit') {
      appData.sha = element.getAttribute('content');
    } else if (element.getAttribute('name') === 'version') {
      appData.version = element.getAttribute('content');
    }
  });
  execAnalytics('setContext', appData);
  return reduction;
}

function* setShopContext(reduction) {
  const shopId = reduction.getIn(['shops', 'current', 'channel_shop_id']);
  const shopName = reduction.getIn(['shops', 'current', 'name']);
  const listingState = reduction.getIn(['shopView', 'filters', 'state']);
  execAnalytics('setContext', { shopId, shopName, listingState });
  return reduction;
}

function* initConfig(reduction, data) {
  execAnalytics('initialize', data);
  return reduction;
}

Reducers.add(new Reducer('Analytics')
  .add(CONSTANTS.ANALYTICS.INIT_CONFIG,      initConfig)
  .add(CONSTANTS.ANALYTICS.UPDATE_USER_INFO, updateUserInfo)
  .add(CONSTANTS.ANALYTICS.SET_SHOP_CONTEXT, setShopContext)
  .add(CONSTANTS.ANALYTICS.TRACK_EVENT,      trackEvent)
  .add(CONSTANTS.ANALYTICS.SET_APP_INFO,     setAppInfo)
);
