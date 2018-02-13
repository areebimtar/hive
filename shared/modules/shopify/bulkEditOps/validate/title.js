import _ from 'lodash';


const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const validateTitle = (value) => {
  let error;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = 'Title is required';
  }
  return error;
};

export const validate = product => {
  return validateTitle(product.get('title'));
};

export const validateAddBefore = values => {
  return {
    value: validateTitle(values && values.value)
  };
};

export const validateAddAfter = values => {
  return {
    value: validateTitle(values && values.value)
  };
};

export const validateReplace = values => {
  return {
    replace: validateTitle(values && values.replace)
  };
};

export const validateInput = values => {
  return {
    value: validateTitle(values && values.value)
  };
};
