import _ from 'lodash';
import { BULK_EDIT_VALIDATIONS } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

function validateVendor(vendor) {
  if (!_.isString(vendor)) {
    return `Vendor must be string`;
  }
  if (!vendor.length || vendor.length > BULK_EDIT_VALIDATIONS.VENDOR_MAX_LENGTH) {
    return `Please enter vendor between 1 and ${BULK_EDIT_VALIDATIONS.VENDOR_MAX_LENGTH} characters long.`;
  }

  return null;
}

export function validate(product) {
  return validateVendor(product.get(FIELDS.VENDOR));
}

export function validateInput(values) {
  return {
    value: validateVendor(values.value)
  };
}
