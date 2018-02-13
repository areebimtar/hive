import _ from 'lodash';
import { List, Map } from 'immutable';
import { MAXIMUM_QUANTITY } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

const nonEmptyString = (value) => {
  return _.isNumber(value) || _.isString(value) && !_.isEmpty(value.trim());
};

const integer = (value) => {
  if (_.isNumber(value)) { return true; }
  const onlyDigits = value.replace(/[^\d]/g, '');
  const int = parseInt(onlyDigits, 10);
  return int === 0 || int.toString() === value;
};

const isZero = (value) => {
  return parseInt(value, 10) === 0;
};

const withinValidRange = (value) => {
  const quantity = parseInt(value, 10);
  return quantity >= 0 && quantity <= MAXIMUM_QUANTITY;
};

export const validateQuantity = (value, ignoreEmpty) => {
  if (!nonEmptyString(value)) {
    return ignoreEmpty ? null : 'Required';
  }

  // ignore empty is set only in bulk controls
  if (integer(value) && isZero(value)) {
    return ignoreEmpty ? 'At least one offering must be in stock' : null;
  }

  if (!integer(value) || !withinValidRange(value)) {
    return `Use a whole number between 0 and ${MAXIMUM_QUANTITY}`;
  }

  return null;
};

export const validateQuantities = (offerings = new List(), ignoreEmpty) => {
  if (ignoreEmpty) { return null; }
  const inStock = offerings.filter((o) => o.get('quantity', 0) > 0);
  const valid = offerings.size === 0 || !!inStock.size;
  return valid ? null : 'At least one offering must be in stock';
};

export const validate = product => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return new Map({ valid: true }); }

  const offerings = product.get('productOfferings', new List());
  const offeringStatusArray = offerings.map(offering => validateQuantity(String(offering.get('quantity'))));
  const individualOfferingsValid = !offeringStatusArray.find(status => !!status);
  const globalStatus = individualOfferingsValid ? validateQuantities(offerings) : null;
  return new Map({
    valid: individualOfferingsValid && !globalStatus,
    data: new Map({
      status: globalStatus,
      offerings: offeringStatusArray
    })
  });
};

export const validateInput = values => {
  const globalStatus = {
    value: parseInt(values.value, 10) === 0 ? 'At least one offering must be in stock' : null
  };
  // get map of errors of fields to be validated
  const errors = _.reduce(values, (result, val, key) => { result[key] = result[key] || validateQuantity(val); return result; }, globalStatus);
  // remove empty keys
  return _.reduce(errors, (result, val, key) => { if (val) { result[key] = val; } return result; }, {});
};
