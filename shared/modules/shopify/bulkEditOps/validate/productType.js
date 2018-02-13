import _ from 'lodash';
import { BULK_EDIT_VALIDATIONS } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

function validateProductType(productType) {
  if (!_.isString(productType)) {
    return `Product type must be string`;
  }
  if (!productType.length || productType.length > BULK_EDIT_VALIDATIONS.PRODUCT_TYPE_MAX_LENGTH) {
    return `Please enter product type between 1 and ${BULK_EDIT_VALIDATIONS.PRODUCT_TYPE_MAX_LENGTH} characters long.`;
  }

  return null;
}

export function validate(product) {
  return validateProductType(product.get(FIELDS.PRODUCT_TYPE));
}

export function validateInput(values) {
  return {
    value: validateProductType(values.value)
  };
}
