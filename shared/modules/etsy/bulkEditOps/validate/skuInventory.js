import _ from 'lodash';
import { List, Map } from 'immutable';
import { MAXIMUM_SKU_LENGTH } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

const nonEmptyString = (value) => {
  return _.isString(value);
};

const maxLength = (value) => {
  return value.trim().length <= MAXIMUM_SKU_LENGTH;
};

const allowedCharacters = (value) => {
  return !value.match(new RegExp('[$^`]', 'g'));
};

export const validateSku = (value) => {
  if (_.isEmpty(value)) { return null; }

  if (!nonEmptyString(value)) {
    return 'Must be string';
  }

  if (!allowedCharacters(value)) {
    return 'Cannot contain $^` characters';
  }

  if (!maxLength(value)) {
    return `SKU can have at most ${MAXIMUM_SKU_LENGTH} characters`;
  }

  return null;
};

export const validateSkus = (offerings) => {
  if (!offerings) { return 'Product must have offerings'; }

  return new Map({
    status: null,
    offerings: offerings.map(offering => validateSku(offering.get('sku')))
  });
};

export const validate = product => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return new Map({ valid: true }); }

  const data = validateSkus(product.get('productOfferings', new List()));
  return new Map({
    valid: !data.get('status') && !data.get('offerings').find(error => !!error),
    data
  });
};

export const validateInput = values => {
  // get map of errors of fields to be validated
  const errors = _.reduce(values, (result, val, key) => { result[key] = validateSku(val); return result; }, {});
  // remove empty keys
  return _.reduce(errors, (result, val, key) => { if (val) { result[key] = val; } return result; }, {});
};
