import XRegExp from 'xregexp';
import S from 'string';
import { List } from 'immutable';
import * as skuInventory from './validate/skuInventory';
import { applyOps, noop, set } from './inventoryUtils';
import { BULK_EDIT_OP_CONSTS, INVENTORY_TYPE_SKU } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import { getOfferingsList } from '../utils/productOfferingsImm';

export const prepend = (value, opValue) => `${opValue}${value}`;
export const append = (value, opValue) => `${value}${opValue}`;
const findAndReplace = (value, opValue) => value.replace(new XRegExp(XRegExp.escape(opValue.find), 'gi'), opValue.replace);
const deleteFn = (value, opValue) => value.replace(new XRegExp(XRegExp.escape(opValue), 'gi'), '');

const formatter = (op, currentValue, value) => {
  const escapedValue = S(value || '').escapeHTML().s;
  const escapedCurrentValue = S(currentValue || '').escapeHTML().s;

  switch (op) {
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE:
      return S(escapedValue).wrapHTML('span', {class: 'add'}).s + escapedCurrentValue;
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER:
      return escapedCurrentValue + S(escapedValue).wrapHTML('span', {class: 'add'}).s;
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE:
      const escapedFind = S(value.find).escapeHTML().s;
      if (value.replace) {
        const escapedReplace = S(value.replace).escapeHTML().wrapHTML('span', {class: 'add'}).s;
        return escapedCurrentValue.replace(new XRegExp(XRegExp.escape(escapedFind), 'gi'), escapedReplace);
      }
      return escapedCurrentValue.replace(new XRegExp(XRegExp.escape(escapedFind), 'gi'), S('$&').wrapHTML('span', {class: 'replace'}).s);
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_DELETE:
      return escapedCurrentValue.replace(new XRegExp(XRegExp.escape(escapedValue), 'gi'), '<span class="del">$&</span>');
    default:
      return null;
  }
};

export const apply = (product, op, values, noFormatting = false) => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return product; }

  let opFn = noop;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE:
      opFn = prepend;
      break;
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER:
      opFn = append;
      break;
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE:
      opFn = findAndReplace;
      break;
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_DELETE:
      opFn = deleteFn;
      break;
    case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO:
      opFn = set;
      break;
  }

  return applyOps(op, 'sku', product, values, !noFormatting && formatter, opFn);
};

export const validate = (product) => {
  return skuInventory.validate(product);
};

export const format = (product) => {
  return new List([getOfferingsList(INVENTORY_TYPE_SKU, product)]);
};

export const equals = (left, right) => {
  // if product offerings, variations and taxonomy ID are all equal. consider products not changed
  const variations = left.get('variations', new List()).equals(right.get('variations', new List()));
  const offerings = left.get('productOfferings', new List()).equals(right.get('productOfferings', new List()));
  const taxonomyId = (left.get('taxonomyId') || left.get('taxonomy_id')) === (right.get('taxonomyId') || right.get('taxonomy_id'));

  return variations && offerings && taxonomyId;
};
