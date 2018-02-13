import _ from 'lodash';
import XRegExp from 'xregexp';

import { MAXIMUM_TAG_LENGTH } from '../../bulkOpsConstants';

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const onlyAllowedCharacters = (value) => {
  const reg = XRegExp('[^\\p{L}\\p{Nd}\\p{Zs}\'-]');
  return !reg.test(value);
};

// tags
const validateTag = (tag) => {
  let error;
  if (!nonEmptyString(tag)) {
    error = 'Tag cannot be empty string';
  } else if (tag.trim() !== tag) {
    error = 'Tag cannot start or end with spaces';
  }
  return error;
};

const validateTagsArray = (tags) => {
  if (!tags || !tags.length) { return null; }
  const uniq = _.uniq(tags);

  if (uniq.length !== tags.length) {
    return 'All tags must be unique';
  }

  const errors = _(tags)
    .map(validateTag)
    .filter(val => !!val)
    .value();
  return (errors.length) ? errors[0] : null;
};

// input field
const validateInputField = (value) => {
  if (!onlyAllowedCharacters(value)) {
    return 'Tag can only include spaces, letters, hyphens, and numbers';
  }
  if (value.length > MAXIMUM_TAG_LENGTH) {
    return `Maximum length of tag is ${MAXIMUM_TAG_LENGTH}`;
  }
  return undefined;
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
  const _tags = product.get('tags');
  const tags = _tags && _tags.toJS && _tags.toJS();
  return validateTagsArray(tags);
};

export const validateInput = values => {
  // get map of errors of fields to be validated
  const errors = _.reduce(values, (result, val, key) => { result[key] = validateInputArray(val); return result; }, {});
  // remove empty keys
  return _.reduce(errors, (result, val, key) => { if (val) { result[key] = val; } return result; }, {});
};
