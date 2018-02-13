import _ from 'lodash';
import { Map } from 'immutable';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS } from '../constants';


export const apply = (product, op, value, noFormatting) => {
  if (op !== BULK_EDIT_OP_CONSTS.SECTION_SET || !_.isString(value) || !value) { return product; }

  let result = product;

  // format style
  if (!noFormatting) {
    result = result.set('_formattedShopSectionId', new Map({ new: value, old: result.get(FIELDS.SECTION_ID) }));
  }
  // set new style to products.style
  result = result.set(FIELDS.SECTION_ID, (value === 'none') ? '' : value);
  // we are done, return updated product
  return result;
};

export const validate = () => new Map({ valid: true });
