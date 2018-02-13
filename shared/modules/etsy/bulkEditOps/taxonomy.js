import _ from 'lodash';
import { Map } from 'immutable';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import * as taxonomyValidate from './validate/taxonomy';
import { updatedOccasionAttributeForTaxonomy } from './occasion';

export const apply = (product, op, value, noFormatting) => {
  if (op !== BULK_EDIT_OP_CONSTS.TAXONOMY_SET || !_.isString(value) || !value) { return product; }

  let result = product;

  // format taxonomy
  if (!noFormatting) {
    result = result.set('_formattedTaxonomyId', new Map({ new: value, old: product.get('taxonomy_id') }));
  }
  // set new taxonomy to products.taxonomy_id
  result = result.set('taxonomy_id', value);
  // update occasion attribute
  result = updatedOccasionAttributeForTaxonomy(result, value);
  // we are done, return updated product
  return result;
};

export const validate = (product) => {
  const error = taxonomyValidate.validate(product);

  return new Map({
    valid: !error,
    data: error
  });
};
