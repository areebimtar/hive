import _ from 'lodash';
import { Map, List } from 'immutable';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS, ATTRIBUTES_IDS } from '../constants';
import { findAttributeIndex, getAttributeValue } from '../utils';
import * as holidayValidate from './validate/holiday';

const getDefaultHolidayAttribute = (value) => new Map({
  propertyId: ATTRIBUTES_IDS.HOLIDAY,
  valueIds: new List(value ? [value] : [])
});

const setValue = (product, value) => {
  let attributes = product.get(FIELDS.ATTRIBUTES, new List());
  const index = findAttributeIndex(attributes, ATTRIBUTES_IDS.HOLIDAY);

  if (index === -1 && value === -1) {
    // do nothing (there is nothing to delete)
  } else if (index === -1 && value > 0) {
    // occasion is not yet set
    attributes = attributes.push(getDefaultHolidayAttribute(value));
  } else if (index !== -1 && value === -1) {
    // remove attribute
    attributes = attributes.delete(index);
  } else if (index !== -1 && value > 0) {
    // update attribute
    attributes = attributes.setIn([index, 'valueIds'], new List([value]));
  }
  return product.set(FIELDS.ATTRIBUTES, attributes);
};

export const apply = (product, op, value, noFormatting) => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return product; }

  if (op !== BULK_EDIT_OP_CONSTS.HOLIDAY_SET || !(_.isString(value) || _.isNumber(value)) || !value) { return product; }

  let result = product;

  // format style
  if (!noFormatting) {
    result = result.set('_formattedHoliday', new Map({ new: value, old: getAttributeValue(product.get(FIELDS.ATTRIBUTES, new List()), ATTRIBUTES_IDS.HOLIDAY) }));
  }
  // set new holiday to products.attributes
  result = setValue(result, value);
  // we are done, return updated product
  return result;
};

export const validate = (product) => {
  const error = holidayValidate.validate(product);

  return new Map({
    valid: !error,
    data: error
  });
};
