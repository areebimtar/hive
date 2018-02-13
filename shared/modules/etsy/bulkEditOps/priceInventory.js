import _ from 'lodash';
import { List } from 'immutable';
import * as priceInventory from './validate/priceInventory';
import { applyOps, noop, add, sub, set } from './inventoryUtils';
import { BULK_EDIT_OP_CONSTS, INVENTORY_TYPE_PRICE } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import { getOfferingsList } from '../utils/productOfferingsImm';

const parseValue = (value, noFormatting) => {
  if (!_.isString(value)) { return value; }

  const matches = value.match(new RegExp(/([\d\.\-])+/g));
  if (!matches || matches.length !== 1) { return value; }
  if (matches[0] !== value) { return value; }
  if (_.countBy(value, char => char === '.').true > 1) { return value; }
  if (value === '-') { return value; }
  if (value === '.') { return 0; }
  if ((value[value.length - 1] === '.') && !noFormatting) { return value; }

  return parseFloat(value);
};

const getApplyToSingle = (op, noFormatting = false, inInline = false) => (value, opValue) => {
  // during inline editing, let user type in anything. it will be accepted/rejected during validation
  // valid values will than be formatted after op is applied
  if (inInline) { return opValue.value; }

  let result;

  if (opValue.type === 'percentage') {
    result = parseFloat(value) * op(1, (parseFloat(opValue.value) || 0) / 100);
  } else {
    result = op(parseFloat(value), parseValue(opValue.value, noFormatting));
  }

  // should we add rounding?
  if ((_.isNumber(result) || result === '') && opValue.rounding) {
    result = Math.trunc(result) + parseFloat(`0.${opValue.rounding}`);
  }

  if (_.isNumber(result)) {
    return result.toFixed(2);
  }

  const parts = String(result).split('.');
  const decimals = parts.length === 2 ? parts.pop() : null;
  if (_.isNull(decimals)) {
    return parts[0];
  }

  return `${parts[0]}.${decimals.slice(0, 2)}`;
};

export const apply = (product, op, values, noFormatting = false, inInline = false) => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return product; }

  let opFn = noop;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_INCREASE_BY:
      opFn = add;
      break;
    case BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_DECREASE_BY:
      opFn = sub;
      break;
    case BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_CHANGE_TO:
      opFn = set;
      break;
  }

  return applyOps(op, 'price', product, values, false, getApplyToSingle(opFn, noFormatting, inInline));
};

export const validate = (product) => {
  return priceInventory.validate(product);
};

export const format = (product) => {
  // format price in offerings
  const formattedProduct = product.update('productOfferings', productOfferings =>
    productOfferings.map(offering => offering.set('_formattedValue', offering.get('price') ? '<span>$' + offering.get('price') + '</span>' : '<span />')));
  // format offerings
  return new List([getOfferingsList(INVENTORY_TYPE_PRICE, formattedProduct)]);
};

export const formatValue = (value) => {
  return !priceInventory.validatePrice(value) ? parseFloat(value).toFixed(2) : value;
};


export const equals = (left, right) => {
  // if product offerings, variations and taxonomy ID are all equal. consider products not changed
  const variations = left.get('variations', new List()).equals(right.get('variations', new List()));
  const offerings = left.get('productOfferings', new List()).equals(right.get('productOfferings', new List()));
  const taxonomyId = (left.get('taxonomyId') || left.get('taxonomy_id')) === (right.get('taxonomyId') || right.get('taxonomy_id'));

  return variations && offerings && taxonomyId;
};
