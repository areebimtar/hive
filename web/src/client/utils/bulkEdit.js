import invariant from 'invariant';
import _ from 'lodash';
import { Map } from 'immutable';
import { getHandlersByChannelId } from 'global/modules/operationHandlers';

const getOpHandlers = (channelId) => {
  return getHandlersByChannelId(channelId);
};

const getOpType = (op) => {
  return (op && op.get('type')) ? op.get('type').split('.').shift() : null;
};

const hasEmptyValue = (op) => {
  const value = op.get('value', null);
  if (!value) { return false; }
  return _.isObject(value) && value.isEmpty();
};

const apply = (channelId, product, op, noFormatting, inInline) => {
  const opHandlers = getOpHandlers(channelId);
  // get operation type
  const type = getOpType(op);
  // if we have handler for it
  return (type && opHandlers[type] && !hasEmptyValue(op)) ? opHandlers[type].apply(product, op.get('type'), op.get('value'), noFormatting, inInline, op.get('meta')) : product;
};

export const validate = (channelId, product, type) => {
  const opHandlers = getOpHandlers(channelId);
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');
  return (type && opHandlers[type]) ? opHandlers[type].validate(product) : new Map({ valid: true });
};

export const applyOp = (channelId, product, op, noFormatting, inInline = false) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // get operation type
  const type = getOpType(op);
  // temporary apply
  const testApply = apply(channelId, product, op, noFormatting, inInline);
  // is temporary applied change valid?
  const isValid = validate(channelId, testApply, type).get('valid');
  return (isValid) ? testApply : product;
};

export const previewOp = apply;

export const format = (channelId, product, type) => {
  const opHandlers = getOpHandlers(channelId);
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');
  const formatter = _.get(opHandlers, `${type}.format`, () => null);
  return formatter(product);
};

export const equals = (channelId, type, left, right) => {
  const opHandlers = getOpHandlers(channelId);

  if (!left || left.isEmpty()) { return false; }
  if (!right || right.isEmpty()) { return false; }
  const comparator = _.get(opHandlers, `${type}.equals`, () => false);
  return comparator(left, right);
};
