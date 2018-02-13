
import {MINIMUM_PASSWORD_LENGTH} from './constants';

/**
 * Validates form data for create account functionality.
 *
 * The input object has this format: property name is the name of form field, property value is what is set
 * in that field. If a given field is not valid, the result object will contain error message under its
 * property name.
 *
 * The return value is empty object in case the validaton succeeds.
 *
 * @param {object} values - values of input fields
 * @return {object} errors - error messages for input fields
 *
 */
const validate = values => {
  const errors = {};

  if (!values.firstname) {
    errors.firstname = 'First name must not be empty.';
  }

  if (!values.lastname) {
    errors.lastname = 'Last name must not be empty.';
  }

  if (!values.email) {
    errors.email = 'Email must not be empty.';
  }

  if (values.password !== values.password2) {
    errors.password = 'Passwords do not match.';
  }

  if (!values.password) {
    errors.password = 'Password cannot be empty.';
  }

  if (values.password && values.password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long.`;
  }

  return errors;
};

export default validate;
