import _ from 'lodash';
import { List } from 'immutable';
import * as quantityInventory from './validate/quantityInventory';
import { applyOps, noop, add, sub, set } from './inventoryUtils';
import { BULK_EDIT_OP_CONSTS, INVENTORY_TYPE_QUANTITY } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import { getOfferingsList } from '../utils/productOfferingsImm';


const getApplyToSingle = op => (value, opValue) => {
  const result = op(parseInt(value, 10), (parseInt(opValue, 10) || opValue));
  return _.isNumber(result) ? result.toFixed(0) : result;
};

export const apply = (product, op, values) => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return product; }

  let opFn = noop;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_INCREASE_BY:
      opFn = add;
      break;
    case BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_DECREASE_BY:
      opFn = sub;
      break;
    case BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_CHANGE_TO:
      opFn = set;
      break;
  }


  return applyOps(op, 'quantity', product, values, false, getApplyToSingle(opFn));
};

export const validate = (product) => {
  return quantityInventory.validate(product);
};

export const format = (product) => {
  return new List([getOfferingsList(INVENTORY_TYPE_QUANTITY, product)]);
};

export const equals = (left, right) => {
  // if product offerings, variations and taxonomy ID are all equal. consider products not changed
  const variations = left.get('variations', new List()).equals(right.get('variations', new List()));
  const offerings = left.get('productOfferings', new List()).equals(right.get('productOfferings', new List()));
  const taxonomyId = (left.get('taxonomyId') || left.get('taxonomy_id')) === (right.get('taxonomyId') || right.get('taxonomy_id'));

  return variations && offerings && taxonomyId;
};
