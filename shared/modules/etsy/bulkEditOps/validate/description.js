import _ from 'lodash';

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const validateDescription = (value) => {
  let error;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = 'Description is required';
  }

  return error;
};

export const validate = product => {
  return validateDescription(product.get('description'));
};

export const validateInput = values => ({
  value: validateDescription(values && values.value)
});
