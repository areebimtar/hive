import _ from 'lodash';
import { List, Map } from 'immutable';
import { MAXIMUM_PRICE_VALUE } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const floatValue = (value) => {
  // are there other chars than digits or period or minus?
  if (!(/^-?\d*(\.\d*)?$/.test(value))) { return false; }
  const float = parseFloat(value);
  return _.isFinite(float);
};

const positive = (value) => {
  const float = parseFloat(value);
  return float > 0;
};

const negative = (value) => {
  const float = parseFloat(value);
  return float < 0;
};

const intValue = (value) => {
  // are there other chars than digits?
  if (/[^\d]/.test(value)) { return false; }
  const int = parseInt(value, 10);
  return _.isFinite(int);
};

const matchLength = (value, length) => {
  return (_.isString(value)) ? value.length <= length : false;
};

const centValue = (value) => {
  const int = parseInt(value, 10);
  return int >= 0 && int < 100;
};

const maxAllowedValue = (value) => {
  const float = parseFloat(value);
  return float <= MAXIMUM_PRICE_VALUE;
};

export const validatePrice = (value, ignoreEmpty = false) => {
  let error = null;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = ignoreEmpty ? null : 'Required';
  // must be float
  } else if (!floatValue(value)) {
    error = 'Must be a number';
    // must be positive number
  } else if (!positive(value)) {
    error = 'Must be positive number';
  } else if (!maxAllowedValue(value)) {
    error = `Must be lower than $${MAXIMUM_PRICE_VALUE}`;
  }
  return error;
};

const validateInputField = (value) => {
  let error = null;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = 'Required';
    // must be float
  } else if (!floatValue(value)) {
    error = 'Must be a number';
    // must be positive number
  } else if (negative(value)) {
    error = 'Must be positive number';
  } else if (!maxAllowedValue(value)) {
    error = `Must be lower than $${MAXIMUM_PRICE_VALUE}`;
  }
  return error;
};

const validateRoundingInputField = (value) => {
  let error = null;
  // value can be empty
  if (!_.isNumber(value) && !value) { return null; }
  // must be positive number
  if (negative(value)) {
    error = 'Must be positive number';
  // must be "cent" value
  } else if (!centValue(value)) {
    error = 'Must be number between 0-100';
  // must be integer
  } else if (!intValue(value)) {
    error = 'Must be int value';
  } else if (!matchLength(value, 2)) {
    error = 'Enter value in 0 or 00 format';
  }
  return error;
};

const validatePrices = (offerings) => {
  if (!offerings) { return 'Product must have offerings'; }

  return new Map({
    status: null,
    offerings: offerings.map(offering => validatePrice(String(offering.get('price'))))
  });
};

export const validate = product => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return new Map({ valid: true }); }

  const data = validatePrices(product.get('productOfferings', new List()));
  return new Map({
    valid: !data.get('status') && !data.get('offerings').find(error => !!error),
    data
  });
};

export const validateInput = values => {
  return {
    value: validateInputField(values.value),
    rounding: validateRoundingInputField(values.rounding),
    type: null
  };
};

export const validateChangeToInput = values => {
  return {
    value: validateInputField(values.value),
    rounding: validateRoundingInputField(values.rounding)
  };
};
