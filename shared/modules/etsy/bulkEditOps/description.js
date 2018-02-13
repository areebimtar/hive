import _ from 'lodash';
import invariant from 'invariant';
import { Map } from 'immutable';
import S from 'string';
import XRegExp from 'xregexp';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from '../bulkOpsConstants';
import * as description from './validate/description';


function getFormattedCountMessage(count) {
  if (!count) { return 'No instances found'; }
  if (count === 1) { return '1 instance found'; }
  return `${count} instances found`;
}

const addBeforeOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    // we need some html formatting for description
    // TODO: find some library for this
    if (!noFormatting) {
      const newLineCount = S(value).lines().length - 1;
      const visibleLines = S(result.get('description', '')).lines().slice(0, BULK_EDIT_VALIDATIONS.TITLE_NUMBER_OF_FORMATED_ROWS).join('\n');
      const escapedValue = S(value).escapeHTML().s;
      const escapedDescription = S(result.get('description', '')).escapeHTML().s;
      const escapedDescriptionShort = S(visibleLines).escapeHTML().s;
      result = result.set('_formattedDescription', new Map({
        value: S(escapedValue).wrapHTML('span', {class: 'add before'}).s + escapedDescriptionShort,
        fullValue: S(escapedValue).wrapHTML('span', {class: 'add before'}).s + escapedDescription,
        lineCount: newLineCount + 6
      }));
    }
    // and finally, update description
    result = result.set('description', value + result.get('description', ''));
  }

  return result;
};

const addAfterOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    // we need some html formatting for description
    // TODO: find some library for this
    if (!noFormatting) {
      const newLines = _.filter(S(value).lines(), line => !!line);
      const newLineCount = newLines.length - 1;
      const visibleLines = S(result.get('description', '')).lines().slice(-BULK_EDIT_VALIDATIONS.TITLE_NUMBER_OF_FORMATED_ROWS).join('\n');
      const escapedValue = S(value).escapeHTML().s;
      const escapedDescription = S(result.get('description', '')).escapeHTML().s;
      const escapedDescriptionShort = S(visibleLines).escapeHTML().s;
      result = result.set('_formattedDescription', new Map({
        value: escapedDescriptionShort + S(escapedValue).wrapHTML('span', {class: 'add after'}).s,
        fullValue: escapedDescription + S(escapedValue).wrapHTML('span', {class: 'add after'}).s,
        lineCount: newLineCount + 6
      }));
    }
    // and finally, update description
    result = result.set('description', result.get('description', '') + value);
  }

  return result;
};

const getFaRLines = (desc, value) => {
  const lines = S(desc).lines();
  const val = (value || '').toLowerCase();
  let lineNumber = _.findIndex(lines, line => line.toLowerCase().indexOf(val) !== -1);
  if (lineNumber === -1) { lineNumber = 0; }
  const previewLines = lines.slice(lineNumber, lineNumber + BULK_EDIT_VALIDATIONS.TITLE_NUMBER_OF_FORMATED_ROWS);
  return previewLines.join('\n');
};

// Every single $ is replaced by two $'s so they are used literally if the string is used in replaced part of XRegExp#replace'
const sanitizeReplace = (replacePart) => XRegExp.replace(replacePart, /\$/, '$$$$', 'all');

const findAndReplaceOp = (product, op, value, noFormatting) => {
  let result = product;

  if (value && !value.isEmpty() && _.isString(value.get('find')) && value.get('find')) {
    const normalizedDescription = S(result.get('description', '')).lines().join('\n');
    const rawReplace = value.get('replace');

    if (!noFormatting) {
      // escape find and description strings
      const escapedFind = S(value.get('find')).escapeHTML().s;
      const escapedDescription = S(normalizedDescription).escapeHTML().s;
      // get lines which are in short preview
      const previewLines = getFaRLines(escapedDescription, escapedFind);

      // count occurences
      const count = (escapedDescription.match(new XRegExp(XRegExp.escape(escapedFind), 'gi')) || []).length;
      // format message with remaining occurences
      const countMsg = getFormattedCountMessage(count);

      const replacePart = rawReplace ?
        sanitizeReplace(S(rawReplace).escapeHTML().wrapHTML('span', {class: 'add'}).s) :
        S('$&').wrapHTML('span', {class: 'replace'}).s;

      const formattedValue = XRegExp.replace(previewLines, new XRegExp(XRegExp.escape(escapedFind.substring(0, previewLines.length)), 'gi'), replacePart);
      const formattedFullValue = XRegExp.replace(escapedDescription, new XRegExp(XRegExp.escape(escapedFind), 'gi'), replacePart);
      const newFormattedDescription = new Map({ value: formattedValue, fullValue: formattedFullValue, count, countMsg, lineCount: 6 });
      result = result.set('_formattedDescription', newFormattedDescription);
    }
    // and finally, update description
    if (_.isString(rawReplace) && rawReplace) {
      const replaceRegExp = new XRegExp(XRegExp.escape(value.get('find')), 'gi');
      const newDescription = normalizedDescription.replace(replaceRegExp, sanitizeReplace(rawReplace));
      result = result.set('description', newDescription);
    }
  }

  return result;
};

const deleteOp = (product, op, value, noFormatting) => {
  let result = product;
  if (_.isString(value) && value) {
    const normalizedDescription = S(result.get('description', '')).lines().join('\n');

    if (!noFormatting) {
      // escape value and description strings
      const escapedValue = S(value).escapeHTML().s;
      const escapedDescription = S(normalizedDescription).escapeHTML().s;
      // get lines which are in short preview
      const previewLines = getFaRLines(escapedDescription, escapedValue);
      // count remaining occurences
      const count = (escapedDescription.match(new XRegExp(XRegExp.escape(escapedValue), 'gi')) || []).length;
      // format message with remaining occurences
      const countMsg = getFormattedCountMessage(count);
      // get value and fullValue

      const formattedValue = XRegExp.replace(previewLines, new XRegExp(XRegExp.escape(escapedValue.substring(0, previewLines.length)), 'gi'), S('$&').wrapHTML('span', {class: 'del'}).s);
      const formattedFullValue = XRegExp.replace(escapedDescription, new XRegExp(XRegExp.escape(escapedValue), 'gi'), S('$&').wrapHTML('span', {class: 'del'}).s);
      // set _formattedDescription
      result = result.set('_formattedDescription', new Map({ value: formattedValue, fullValue: formattedFullValue, count, countMsg, lineCount: 6 }));
    }
    // and finally, update description
    const newDescription = XRegExp.replace(normalizedDescription, new XRegExp(XRegExp.escape(value), 'gi'), '');
    result = result.set('description', newDescription);
  }

  return result;
};

const setOp = (product, op, value) => {
  let result = product;
  if (_.isString(value)) {
    // update description
    result = result.set('description', value);
  }

  return result;
};

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER:
      result = addAfterOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE:
      result = addBeforeOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE:
      result = findAndReplaceOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE:
      result = deleteOp(product, op, value, noFormatting);
      break;
    case BULK_EDIT_OP_CONSTS.DESCRIPTION_SET:
      result = setOp(product, op, value);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // validate description string
  const error = description.validate(product);

  return new Map({ valid: !error, data: error });
};
