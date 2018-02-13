import _ from 'lodash';
import { compareIds } from '../utils';
import { INVENTORY_TABS_TYPES_INFLUENCE } from '../bulkOpsConstants';

export const noop = value => value;
export const add = (value, opValue) => value + (opValue || 0);
export const sub = (value, opValue) => value - (opValue || 0);
export const set = (value, opValue) => opValue;

export const applyOp = (op, type, product, opValue, formatter, opFn) => {
  const opValueJs = opValue && opValue.toJS();
  if (!_.isObject(opValueJs) || _.isNull(opValueJs)) { return product; }

  let result = product;
  const { index, combination, value } = opValueJs;

  if (_.isNull(index) && _.isNull(combination)) { // update global value
    result = result.update('productOfferings', offerings => {
      return offerings.map(offering => {
        const currentValue = offering.get(type);
        const newValue = opFn(currentValue, value);
        const resultOffering = formatter ? offering.set('_formattedValue', formatter(op, currentValue, value, newValue)) : offering;
        return resultOffering.set(type, newValue);
      });
    });
  } else if (!_.isNull(combination)) { // set all combination values
    result = result.update('productOfferings', offerings => offerings.map(offering => {
      const shouldUpdate = offering.get('variationOptions').find(option => compareIds(option.get('variationId'), combination.variationId) && compareIds(option.get('optionId'), combination.optionId));

      if (!shouldUpdate) { return offering; }

      return offering
        .update(type, currentValue => opFn(currentValue, value));
    }));
  } else if (!_.isNull(index)) {
    result = result.updateIn(['productOfferings', index], offering =>
      offering.update(type, currentValue => opFn(currentValue, value)));
  }

  return result;
};

export const applyOps = (op, type, product, opValues, noFormatting, opFn) => {
  if (!opValues) { return product.set('_unapplied', true); }
  return opValues.reduce((result, opValue) => {
    return applyOp(op, type, result, opValue, noFormatting, opFn);
  }, product).set('_unapplied', false);
};

const INFLUENCING_TYPES = _.filter(INVENTORY_TABS_TYPES_INFLUENCE);

function influencingCount(variations, influencesType) {
  return variations.reduce((num, variation) => num + !!variation.get(influencesType), 0);
}

function allInfluencing(variations, influencesType) {
  return !!(influencingCount(variations, influencesType) === 2);
}
function allInfluencingCount(variations) {
  return _.reduce(INFLUENCING_TYPES, (influencingBoth, type) => influencingBoth + allInfluencing(variations, type), 0);
}

export function updateVariationsCheckboxes(variations, index, influencesType, checked) {
  // fo ronly one variation, there is no special treatment
  if (variations.size === 1) {
    return variations.setIn([index, influencesType], checked);
  }

  // for two variations we need to check if there is property which influences both variations
  const hasBothInfluencingPrperty = allInfluencingCount(variations);
  // if so, we need to toggle both checkboxes
  if (hasBothInfluencingPrperty) {
    // but only if it is not last both inluencting property
    if (!checked && hasBothInfluencingPrperty === 1) {
      return variations.setIn([index, influencesType], false);
    }
    return variations.map(variation => variation.set(influencesType, checked));
  }
  // there is no property which influences both variations.
  // if user is checking second checkbox, we need to check second checkbox on other properties as well
  if (checked) {
    const result = variations.setIn([index, influencesType], checked);
    const count = influencingCount(result, influencesType);
    if (count === 2) {
      return _.reduce(INFLUENCING_TYPES, (res, type) => {
        if (influencingCount(res, type)) {
          return res.map(variation => variation.set(type, true));
        }
        return res;
      }, result);
    }
    return result;
  }
  // clear last checkbox
  return variations.setIn([index, influencesType], false);
}
