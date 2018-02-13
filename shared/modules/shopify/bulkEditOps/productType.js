import _ from 'lodash';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import { Map } from 'immutable';
import invariant from 'invariant';

import * as productType from './validate/productType';

function setOp(product, op, value, noFormatting) {
  if (!_.isString(value) || !value) { return product; }

  let result = product;

  // format product type
  if (!noFormatting) {
    result = result.set('_formattedProductType', new Map({ new: value, old: result.get(FIELDS.PRODUCT_TYPE) }));
  }
  // set new product type to products.product_type
  result = result.set(FIELDS.PRODUCT_TYPE, (value === 'None') ? '' : value);
  // we are done, return updated product
  return result;
}

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET:
      result = setOp(product, op, value, noFormatting);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // validate value
  const error = productType.validate(product);

  return new Map({ valid: !error, data: error });
};
