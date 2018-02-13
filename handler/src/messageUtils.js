import _ from 'lodash';
import { MESSAGE_TYPE } from './constants';
import * as guid from 'global/guid';

const PATHS = {
  HEADER: ['headers'],
  BODY: ['body'],
  STACK: ['stack']
};

export function getStack(message) {
  const msg = _.cloneDeep(message);
  return _.get(msg, PATHS.STACK, []);
}

export function getChildStack(message) {
  const msg = _.cloneDeep(message);
  const stack = _.get(msg, PATHS.STACK, []);
  stack.unshift(_.get(msg, PATHS.HEADER, null));
  return stack;
}

export function getStackWithHeaders(message, headers) {
  const stack = getStack(message);
  stack.unshift(headers);
  return stack;
}

export function getHeaders(message) {
  const msg = _.cloneDeep(message);
  return _.get(msg, PATHS.HEADER, {});
}

export function getBody(message) {
  const msg = _.cloneDeep(message);
  return _.get(msg, PATHS.BODY, {});
}

export function setHeaderField(message, fieldName, value) {
  const msg = _.cloneDeep(message);
  return _.set(msg, PATHS.HEADER.concat(fieldName), value);
}

export function getHeaderField(message, fieldName, defaultValue) {
  const msg = _.cloneDeep(message);
  return _.get(msg, PATHS.HEADER.concat(fieldName), defaultValue);
}

export function getBodyField(message, fieldName, defaultValue) {
  const msg = _.cloneDeep(message);
  return _.get(msg, PATHS.BODY.concat(fieldName), defaultValue);
}

export function setBodyField(message, fieldName, value) {
  const msg = _.cloneDeep(message);
  return _.set(msg, PATHS.BODY.concat(fieldName), value);
}

export function getParentStackField(message, fieldName, defaultValue) {
  const msg = _.cloneDeep(message);
  return _.get(msg, PATHS.STACK.concat([0].concat(fieldName)), defaultValue);
}

// this function exists only because sinon.stub which doesn't see directly exported function (eg export { getNewMessageId } from 'global/guid'; )
export function getNewMessageId() {
  return guid.getNewMessageId();
}

export function getErrorType(message) {
  const type = getHeaderField(message, 'type', '');
  return `${type}.${MESSAGE_TYPE.ERROR}`;
}

export function stripPrefix(messageType) {
  const type = String(messageType);
  return String(type).substring(type.indexOf('.') + 1);
}
