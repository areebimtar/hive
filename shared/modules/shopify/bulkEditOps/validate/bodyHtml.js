import _ from 'lodash';
import { FIELDS } from '../../constants';

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value) && value !== '<p><br></p>';
};

const validateBodyHtml = (value) => {
  let error;
  // must be string and cannot be empty
  if (!nonEmptyString(value)) {
    error = 'Description is required';
  }

  return error;
};

export const validate = product => {
  return validateBodyHtml(product.get(FIELDS.BODY_HTML));
};

export const validateInput = values => ({
  value: validateBodyHtml(values && values.value)
});

export const validateInputs = values => ({
  find: validateBodyHtml(values && values.find),
  replace: validateBodyHtml(values && values.replace)
});
