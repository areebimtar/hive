import _ from 'lodash';
import XRegExp from 'xregexp';

import { MAXIMUM_MATERIAL_LENGTH } from '../../bulkOpsConstants';

// material is valid if it does not match /[^\p{L}\p{Nd}\p{Zs}]/u

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const onlyAllowedCharacters = (value) => {
  const reg = XRegExp('[^\\p{L}\\p{Nd}\\p{Zs}]');
  return !reg.test(value);
};

// materials
const validateMaterial = (material) => {
  let error;
  if (!nonEmptyString(material)) {
    error = 'Material cannot be empty string';
  // must begin with aplhanum character
  } else if (material.trim() !== material) {
    error = 'Material cannot start or end with spaces';
  } else if (!onlyAllowedCharacters(material)) {
    error = 'Materials can only include spaces, letters, and numbers.';
  } else if (material.length > MAXIMUM_MATERIAL_LENGTH) {
    error = `Materials must be ${MAXIMUM_MATERIAL_LENGTH} characters or less.`;
  }
  return error;
};

const validateMaterialsArray = (materials) => {
  if (!materials) { return true; }

  const uniq = _.uniq(materials);
  if (uniq.length !== materials.length) {
    return 'All materials must be unique';
  }

  const errors = _(materials)
    .map(validateMaterial)
    .filter(val => !!val)
    .value();
  return (errors.length) ? errors[0] : null;
};

// input field
const validateInputField = (value) => {
  let error;
  if (!onlyAllowedCharacters(value)) {
    error = 'Materials can only include spaces, letters, and numbers.';
  }
  if (value.length > MAXIMUM_MATERIAL_LENGTH) {
    error = `Materials must be ${MAXIMUM_MATERIAL_LENGTH} characters or less.`;
  }
  return error;
};

const validateInputArray = (value) => {
  const errors = _((value || '').split(','))
    .map(val => val.trim())
    .filter(val => !!val)
    .map(validateInputField)
    .filter(val => !!val)
    .value();
  return (errors.length) ? errors[0] : null;
};

// exports
export const validate = (product) => {
  const _materials = product.get('materials');
  const materials = _materials && _materials.toJS();
  return validateMaterialsArray(materials);
};

export const validateInput = values => {
  // get map of errors of fields to be validated
  const errors = _.reduce(values, (result, val, key) => { result[key] = validateInputArray(val); return result; }, {});
  // remove empty keys
  return _.reduce(errors, (result, val, key) => { if (val) { result[key] = val; } return result; }, {});
};
