import _ from 'lodash';
import { fromJS } from 'immutable';

export function isEmptyOrFalsy(value) {
  if (_.isFunction(_.get(value, 'isEmpty'))) {
    return value.isEmpty();
  } else if (_.isArray(value)) {
    return value.length === 0;
  } else if (_.isPlainObject(value)) {
    return _.isEqual(value, {});
  } else {
    return !value;
  }
}

export function toImmutable(value) {
  return value.toJS ? value : fromJS(value);
}

export function clip(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// https://stackoverflow.com/questions/11219582/how-to-detect-my-browser-version-and-operating-system-using-javascript
export function getBrowserInfo() {
  const { appName, userAgent } = navigator;
  const version = userAgent.match(/version\/([\.\d]+)/i);
  const name = userAgent.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
  if (name && version !== null) name[2] = version[1];
  return name ? { name: name[1], version: name[2] } : { name: appName, version: navigator.appVersion };
}
