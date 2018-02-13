import _ from 'lodash';
import { Map, List } from 'immutable';
import { BULK_EDIT_OP_CONSTS } from '../bulkOpsConstants';
import { FIELDS, ATTRIBUTES_IDS } from '../constants';
import { findAttributeIndex, getAttributeValue } from '../utils';
import * as occasionValidate from './validate/occasion';
import { getAttribute } from '../attributes/taxonomyNodeProperties';

const getDefaultOccasionAttribute = (value) => new Map({
  propertyId: ATTRIBUTES_IDS.OCCASION,
  valueIds: new List(value ? [value] : [])
});

const setValue = (product, value) => {
  let attributes = product.get(FIELDS.ATTRIBUTES, new List());
  const index = findAttributeIndex(attributes, ATTRIBUTES_IDS.OCCASION);

  if (index === -1 && value === -1) {
    // do nothing (there is nothing to delete)
  } else if (index === -1 && value > 0) {
    // occasion is not yet set
    attributes = attributes.push(getDefaultOccasionAttribute(value));
  } else if (index !== -1 && value === -1) {
    // remove attribute
    attributes = attributes.delete(index);
  } else if (index !== -1 && value > 0) {
    // update attribute
    attributes = attributes.setIn([index, 'valueIds'], new List([value]));
  }

  return product.set(FIELDS.ATTRIBUTES, attributes);
};

export const apply = (product, op, value, noFormatting) => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return product; }

  if (op !== BULK_EDIT_OP_CONSTS.OCCASION_SET || !(_.isString(value) || _.isNumber(value)) || !value) { return product; }

  let result = product;

  // format style
  if (!noFormatting) {
    result = result.set('_formattedOccasion', new Map({ new: value, old: getAttributeValue(product.get(FIELDS.ATTRIBUTES, new List()), ATTRIBUTES_IDS.OCCASION) }));
  }
  // set new occasion to products.attributes
  result = setValue(result, value);
  // we are done, return updated product
  return result;
};

export const validate = (product) => {
  const error = occasionValidate.validate(product);

  return new Map({
    valid: !error,
    data: error
  });
};

export const updatedOccasionAttributeForTaxonomy = (product, taxonomyId) => {
  const options = getAttribute('occasion', taxonomyId).get('availableOptions', new List());

  let attributes = product.get('attributes', new List());
  let occasionAttributeIndex = attributes.findIndex(attribute => String(attribute.get('propertyId')) === ATTRIBUTES_IDS.OCCASION);

  if (!options.size) {
    // if there are no options but we have some value in attribute,
    // it must be wrong value hance we should remove it
    if (occasionAttributeIndex !== -1) {
      attributes = attributes.delete(occasionAttributeIndex);
      return product.set('attributes', attributes);
    }
    return product;
  }
  // insert new attribute into attributes array
  if (occasionAttributeIndex === -1) {
    attributes = attributes.push(getDefaultOccasionAttribute());
    occasionAttributeIndex = attributes.size - 1;
  }

  // we have only one option, set its value in attributes
  if (options.size === 1) {
    attributes = attributes.setIn([occasionAttributeIndex, 'valueIds', 0], options.getIn([0, 'id']));
    return product.set('attributes', attributes);
  }

  // we have multiple options, check if we have valid value
  const valueId = attributes.getIn([occasionAttributeIndex, 'valueIds', 0], null);
  if (!valueId) { return product; }

  // we do not have valid value, use first value from options
  const validOption = !!options.find(option => parseInt(option.get('id'), 10) === parseInt(valueId, 10));
  if (validOption) { return product; }
  return product.setIn(['attributes', occasionAttributeIndex, 'valueIds', 0], options.getIn([0, 'id']));
};
