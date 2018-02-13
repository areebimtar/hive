import _ from 'lodash';
import { Map } from 'immutable';
import { isRecipientSetViaVariation } from '../variations/variationUiUtil';

export const apply = (product, op, value, noFormatting) => {
  if (!_.isString(value) || isRecipientSetViaVariation(product.toJS())) { return product; }

  let result = product;

  // format recipient
  if (!noFormatting) {
    result = result.set('_formattedRecipient', new Map({ new: value, old: result.get('recipient') }));
  }
  // set new recipient to products.recipient
  // if recipient is set to 'none' then we should clear the value
  result = result.set('recipient', value === 'none' ? undefined : value);
  // we are done, return updated product
  return result;
};

export const validate = (/* product */) => (new Map({ valid: true }));
