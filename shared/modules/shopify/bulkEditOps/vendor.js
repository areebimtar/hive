import _ from 'lodash';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import { Map } from 'immutable';
import invariant from 'invariant';

import * as vendor from './validate/vendor';

function setOp(product, op, value, noFormatting) {
  if (!_.isString(value) || !value) { return product; }

  let result = product;

  // format vendor
  if (!noFormatting) {
    result = result.set('_formattedVendor', new Map({ new: value, old: result.get(FIELDS.VENDOR) }));
  }
  // set new vendor to products.vendor
  result = result.set(FIELDS.VENDOR, (value === 'None') ? '' : value);
  // we are done, return updated product
  return result;
}

export const apply = (product, op, value, noFormatting) => {
  let result = product;
  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.VENDOR_SET:
      result = setOp(product, op, value, noFormatting);
      break;
  }
  return result;
};

export const validate = (product) => {
  invariant(product && !product.isEmpty(), 'Valid product must be passed as an input');

  // validate value
  const error = vendor.validate(product);

  return new Map({ valid: !error, data: error });
};
