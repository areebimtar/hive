import _ from 'lodash';
import { Map } from 'immutable';
import invariant from 'invariant';
import S from 'string';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from '../bulkOpsConstants';
import * as title from './validate/title';
import XRegExp from 'xregexp';


const addAfterOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    // we need some html formatting for title
    // TODO: find some library for this
    if (!noFormatting) {
      const escapedValue = S(value).escapeHTML().s;
      const escapedTitle = S(result.get('title', '')).escapeHTML().s;
      result = result.set('_formattedTitle', escapedTitle + S(escapedValue).wrapHTML('span', {class: 'add'}).s);
    }
    // and finally, update title
    result = result.set('title', result.get('title', '') + value);
  }

  return result;
};

const addBeforeOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    // we need some html formatting for title
    // TODO: find some library for this
    if (!noFormatting) {
      const escapedValue = S(value).escapeHTML().s;
      const escapedTitle = S(result.get('title', '')).escapeHTML().s;
      result = result.set('_formattedTitle', S(escapedValue).wrapHTML('span', {class: 'add'}).s + escapedTitle);
    }
    // and finally, update title
    result = result.set('title', value + result.get('title', ''));
  }

  return result;
};

const findAndReplaceOp = (product, op, value, noFormatting) => {
  let result = product;
  if (value && !value.isEmpty() && _.isString(value.get('find')) && value.get('find')) {
    // we need some html formatting for title
    // TODO: find some library for this
    if (!noFormatting) {
      const escapedFind = S(value.get('find')).escapeHTML().s;
      const escapedTitle = S(result.get('title', '')).escapeHTML().s;
      if (value.get('replace')) {
        const escapedReplace = S(value.get('replace')).escapeHTML().wrapHTML('span', {class: 'add'}).s;
        result = result.set('_formattedTitle', escapedTitle.replace(new XRegExp(XRegExp.escape(escapedFind), 'gi'), escapedReplace));
      } else {
        result = result.set('_formattedTitle', escapedTitle.replace(new XRegExp(XRegExp.escape(escapedFind), 'gi'), S('$&').wrapHTML('span', {class: 'replace'}).s));
      }
    }
    // and finally, update title
    if (_.isString(value.get('replace')) && value.get('replace')) {
      result = result.set('title', result.get('title', '').replace(new XRegExp(XRegExp.escape(value.get('find')), 'gi'), value.get('replace')));
    }
  }

  return result;
};

const deleteOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    // we need some html formatting for title
    // TODO: find some library for this
    if (!noFormatting) {
      const escapedValue = S(value).escapeHTML().s;
      const escapedTitle = S(result.get('title', '')).escapeHTML().s;
      result = result.set('_formattedTitle', escapedTitle.replace(new XRegExp(XRegExp.escape(escapedValue), 'gi'), '<span class="del">$&</span>'));
    }
    // and finally, update title
    result = result.set('title', result.get('title', '').replace(new XRegExp(XRegExp.escape(value), 'gi'), ''));
  }

  return result;
};

const setOp = (product, op, value) => {
  let result = product;
  if (_.isString(value)) {
    // update title
    result = result.set('title', value);
  }

  return result;
};

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER:
      result = addAfterOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE:
      result = addBeforeOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE:
      result = findAndReplaceOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.TITLE_DELETE:
      result = deleteOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.TITLE_SET:
      result = setOp(product, op, value);
      break;
  }
  return result;
};

function getFormattedTitleMessage(count) {
  if (!count) { return 'no characters remaining'; }
  if (count === 1) { return '1 character remaining'; }
  return `${count} characters remaining`;
}

function getFormattedInvalidTitleMessage(count) {
  if (count === 1) { return '1 character over limit'; }
  return `${count} characters over limit`;
}

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // get length
  const length = product.get('title', '').length;
  // validate title string
  const error = title.validate(product);
  const validString = !error;
  // title length is valid only if lentgh is smaller then TITLE_MAX_LENGTH
  const validLength = length > 0 && length <= BULK_EDIT_VALIDATIONS.TITLE_MAX_LENGTH;
  // how many chracters are remaining
  const N = BULK_EDIT_VALIDATIONS.TITLE_MAX_LENGTH - length;
  // compose message
  let message = error;
  if (validString) {
    message = ((validLength) ? getFormattedTitleMessage : getFormattedInvalidTitleMessage)(Math.abs(N));
  }
  // and finally return result
  return new Map({ valid: validString && validLength, data: message });
};
