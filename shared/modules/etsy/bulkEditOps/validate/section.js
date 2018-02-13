import _ from 'lodash';
import XRegExp from 'xregexp';
import { MAXIMUM_SECTION_LENGTH } from '../../bulkOpsConstants';
// section is valid if it does not match /[^\p{L}\p{Nd}\p{Zs}\-'™©®]/u

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const onlyAllowedCharacters = (value) => {
  const reg = XRegExp('[^\\p{L}\\p{Nd}\\p{Zs}\'™©®\-]');
  return !reg.test(value);
};

// tags
const validateSection = (section) => {
  let error;
  if (!nonEmptyString(section) || (section.length > MAXIMUM_SECTION_LENGTH)) {
    error = `Please enter section title between 1 and ${MAXIMUM_SECTION_LENGTH} characters long.`;
  // must begin with aplhanum character
  } else if (section.trim() !== section) {
    error = 'Section cannot start or end with spaces';
  } else if (!onlyAllowedCharacters(section)) {
    error = 'Section can contain only alphanumerical characters, space and -\'™©® are allowed';
  }
  return error;
};

// exports
export const validate = (product) => {
  return validateSection(product.get('shop_section_id'));
};

export const validateInput = values => {
  return {
    value: validateSection(values && values.value)
  };
};
