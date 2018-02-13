import _ from 'lodash';
import { fromJS, Map, List, Set } from 'immutable';
import * as variationsInventory from './validate/variationsInventory';
import { BULK_EDIT_OP_CONSTS, MAXIMUM_QUANTITY } from '../bulkOpsConstants';
import { FIELDS } from '../constants';
import getGUID from '../../../guid';

import { getPropertyData, getUiState } from '../attributes/taxonomyNodeProperties';
import { getOfferingsData } from '../utils/productOfferingsImm';
import { getPropValue } from '../utils';
import * as taxonomyUtils from './taxonomyUtils';

import * as priceInventory from './priceInventory';

import { updatedOccasionAttributeForTaxonomy } from './occasion';

const getNumOfInfluences = (variations, type) => variations.reduce((count, variation) => count + !!variation.get(type), 0);

const getSum = (offerings) => {
  const total = offerings.reduce((sum, offering) => {
    // skip hidden offerings
    if (!offering.get('visibility', true)) { return sum; }
    // get new sum
    const val = parseFloat(offering.get('quantity')) || 0;
    if (sum === null) { return val; }
    return sum + val;
  }, null);
  return Math.min(total, MAXIMUM_QUANTITY);
};

const getSumOfferingQuantity = (oldVariations, offerings, defaultValue = null) => {
  if (!oldVariations || !oldVariations.size || !offerings || !offerings.size) { return defaultValue; }

  const oldNumOfInfluences = getNumOfInfluences(oldVariations, 'influencesQuantity');

  // copy global value
  if (oldNumOfInfluences === 0) {
    const offering = offerings.find(item => item.get('visibility', true));
    return offering ? offering.get('quantity', defaultValue) : defaultValue;
  }
  // do partial sum on influencing values
  if (oldNumOfInfluences === 1) {
    const index = oldVariations.findIndex(variation => variation.get('influencesQuantity', false));
    const influencingOfferings = offerings.reduce((result, offering) => {
      const key = offering.getIn(['variationOptions', index]).get('optionId');
      if (!result.get(key) && offering.get('visibility', true)) {
        return result.set(key, offering);
      }
      return result;
    }, new Map()).toList();
    return getSum(influencingOfferings);
  }

  return getSum(offerings);
};

const getQuantity = (product, newVariations, offeringValue, inInline) => {
  // value entered by user takes precedence
  if (offeringValue) { return offeringValue; }

  const variations = product.get('variations', new Map()).toList();
  const offerings = product.get('productOfferings', new List());
  const influencesQuantityNew = getNumOfInfluences(newVariations, 'influencesQuantity');
  const influencesQuantityOld = getNumOfInfluences(variations, 'influencesQuantity');

  // if new variation does not use global quantity, return value from offering
  if (influencesQuantityNew) { return offeringValue; }

  // handle global value
  // if product does not have existing variations, return global guantity
  if (!variations.size) { return product.get('quantity'); }
  // if product has existing variations, but does not use individual quantities
  // (influenceQuantity === false on all variations), return global quantity
  if (!influencesQuantityOld && !inInline) { return product.get('quantity'); }
  // if product has existing variation and uses individual quantities
  // on at one variation, but not on all of them, return sum of offerings values
  // which are directly influencing quantity (eg are on influencing variation options)
  if (influencesQuantityOld === 1) {
    const variationId = variations.find(variation => !!variation.get('influencesQuantity')).get('id');
    // we only sum quantyties on offerings which correspond influencin variation options
    // build map with unique variation/option id key to filter out multiple same values
    // then we will convert map to attay (will keep only values) and do the sum
    const optionIndex = offerings.get(0, new List()).get('variationOptions', new List()).findIndex(item => item.get('variationId') === variationId);
    const valuesMap = offerings.reduce((map, offering) => {
      const optionId = offering.getIn(['variationOptions', optionIndex, 'optionId']);
      return _.set(map, variationId + '-' + optionId, offering.get('quantity'));
    }, {});
    return Math.min(_.sum(valuesMap, val => parseInt(val, 10)), MAXIMUM_QUANTITY);
  }
  // if product has existing variation and uses individual quantities
  // on all variations, return sum of all values on all offerings
  if (influencesQuantityOld === 2) {
    return Math.min(offerings.reduce((count, offering) => count + parseInt(offering.get('quantity'), 10), 0), MAXIMUM_QUANTITY);
  }

  return offeringValue;
};

const getMinPrice = (offerings, defaultValue = null) => {
  if (!offerings || !offerings.size) { return defaultValue; }

  return offerings.reduce((min, offering) => {
    // skip hidden offerings
    if (!offering.get('visibility', true)) { return min; }
    // get new minimum
    const val = parseFloat(offering.get('price')) || 0;
    if (min === null) { return val; }
    return min > val ? val : min;
  }, null);
};

const getMinOfferingPrice = (oldVariations, offerings, defaultValue = null) => {
  if (!oldVariations || !oldVariations.size || !offerings || !offerings.size) { return defaultValue; }

  const oldNumOfInfluences = getNumOfInfluences(oldVariations, 'influencesQuantity');

  // copy global value
  if (oldNumOfInfluences === 0) {
    const offering = offerings.find(item => item.get('visibility', true));
    return offering ? offering.get('price', defaultValue) : defaultValue;
  }
  // do partial sum on influencing values
  if (oldNumOfInfluences === 1) {
    const index = oldVariations.findIndex(variation => variation.get('influencesQuantity', false));
    const influencingOfferings = offerings.reduce((result, offering) => {
      const key = offering.getIn(['variationOptions', index]).get('optionId');
      return !result.get(key) ? result.set(key, offering) : result;
    }, new Map()).toList();
    return getMinPrice(influencingOfferings);
  }

  return getMinPrice(offerings);
};

const getPrice = (product, newVariations, offeringValue, inInline) => {
  // value entered by user takes precedence
  if (offeringValue) { return offeringValue; }

  const variations = product.get('variations', new Map()).toList();
  const offerings = product.get('productOfferings', new List());
  const influencesPriceNew = getNumOfInfluences(newVariations, 'influencesPrice');
  const influencesPriceOld = getNumOfInfluences(variations, 'influencesPrice');

  // if new variation does not use global price, return value from offering
  if (influencesPriceNew) { return offeringValue; }

  // handle global value
  // if product does not have existing variations, return global price
  if (!variations.size) { return product.get('price'); }
  // if product has existing variations, but does not use individual pricing
  // (influenceQuantity === false on all variations), return global price
  if (!influencesPriceOld && !inInline) { return product.get('price'); }
  // if product has existing variations and at least one of them has individual pricing
  // return least price form offerings
  if (influencesPriceOld) {
    return getMinOfferingPrice(variations.toList(), offerings);
  }

  return offeringValue;
};

const getOfferingsSku = (offerings) => {
  if (!offerings || !offerings.size) { return null; }

  const skus = offerings.reduce((map, offering) => {
    const value = offering.get('sku');
    // skip hidden offerings
    if (!offering.get('visibility', true) || !value) { return map; }
    // set sku as key
    return map.add(value);
  }, new Set());

  if (skus.size !== 1) { return null; }
  return skus.toList().get(0);
};

const getSku = (product, newVariations, offeringValue, inInline) => {
  if (inInline) { return offeringValue; }
  // value entered by user takes precedence
  if (offeringValue || offeringValue === '') { return offeringValue; }

  const offerings = product.get('productOfferings', new List());
  const influencesSkuNew = getNumOfInfluences(newVariations, 'influencesSku');

  // if new variation does not use global sku, return value from offering
  if (influencesSkuNew) { return offeringValue; }

  // handle global value
  const skus = offerings.reduce((map, offering) => {
    const sku = offering.get('sku');
    return map.set(sku, sku);
  }, new Map()).toList();
  // if skus are same on all offerings, return that value
  if (skus.size === 1) { return skus.get(0); }

  return '';
};

function stringOrNull(value) {
  return _.isNull(value) ? value : String(value);
}

export const getValue = (type, product, newVariations, offeringValue, inInline) => {
  switch (type) {
    case 'price':
      return stringOrNull(getPrice(product, newVariations, offeringValue, inInline));
    case 'quantity':
      return getQuantity(product, newVariations, offeringValue, inInline);
    case 'sku':
      return stringOrNull(getSku(product, newVariations, offeringValue, inInline));
    default:
      return null;
  }
};

const applyVariation = (product, value, noFormatting = false, inInline = false, meta) => {
  let result = product;
  const isPreview = !noFormatting;
  const doNotApply = !value || !value.get('taxonomyId');

  if (isPreview && !inInline) {
    return result.set('_unapplied', doNotApply);
  }

  if (doNotApply) {
    return result;
  }

  // applying variation always sets the taxonomy on the product
  result = product.set('taxonomy_id', value.get('taxonomyId'));
  // update occasion attribute
  result = updatedOccasionAttributeForTaxonomy(result, value.get('taxonomyId'));

  const variations = value
    .get('variations', new Map())
    .toList()
    .filter(variation => !!variation.get('propertyId'));

  if (isPreview && value.get('taxonomyId')) {
    result = result.set('_formattedVariationsInventory', meta.update('offeringsData', offeringsData => {
      if (!offeringsData) { return offeringsData; }
      if (!offeringsData.get('showGlobalValue')) { return offeringsData; }

      const val = getValue(offeringsData.get('type'), product, variations, null, inInline);
      return offeringsData.update('globalValue', globalValue => globalValue || val);
    }));
  }

  if (!variations.size) {
    const price = getMinOfferingPrice(product.get('variations', new Map()).toList(), product.get('productOfferings', new List()), product.get('price'));
    const quantity = getSumOfferingQuantity(product.get('variations', new Map()).toList(), product.get('productOfferings', new List()), product.get('quantity'));
    const sku = getOfferingsSku(product.get('productOfferings', new List()), null);
    result = result
      .delete('variations')
      .set('productOfferings', new List([
        new Map({
          price,
          quantity,
          sku,
          variationOptions: new List(),
          visibility: true})
      ]))
      .set('price', price)
      .set('quantity', quantity);
  } else {
    result = result
      .set('variations',
        value.get('variations')
          .filter(variation => !!variation.get('propertyId'))
          .reduce((map, variation, index) => {
            const property = getPropertyData(variation.get('propertyId'));
            const propertyName = property && property.displayName;
            const newVariation = variation
              .set('id', variation.get('id') || -getGUID())
              .set('first', index === 0)
              .set('formattedName', variation.get('formattedName') || propertyName);

            return map.set(newVariation.get('id'), newVariation);
          }, new Map()))
      .set('productOfferings',
        value.get('offerings').update(productOfferings => productOfferings.map(offering => offering
        .update('price', price => inInline ? getValue('price', product, variations, price, inInline) : priceInventory.formatValue(getValue('price', product, variations, price, inInline)))
        .update('quantity', quantity => getValue('quantity', product, variations, quantity, inInline))
        .update('sku', sku => getValue('sku', product, variations, sku, inInline))
      )));
  }

  return result;
};

export const apply = (product, op, value, noFormatting, inInline, meta) => {
  if (!product.get(FIELDS.CAN_WRITE_INVENTORY)) { return product; }

  switch (op) { // eslint-disable-line default-case
    case BULK_EDIT_OP_CONSTS.VARIATIONS_INVENTORY_CHANGE_TO:
      return applyVariation(product, value, noFormatting, inInline, meta);
  }

  return product;
};

export const validate = (product) => {
  return variationsInventory.validate(product);
};

export const format = (product) => {
  // get taxonomyId and variations array
  const taxonomyId = product.get('taxonomyId', null) || product.get('taxonomy_id', null);
  let variations = product.get('variations', new Map()).toList();
  const offerings = product.get('productOfferings', new List());
  const activeTab = product.getIn(['_formattedVariationsInventory', 'activeTab'], 0);
  // count only non-empty variations
  const originalLength = variations.filter(v => !!v.get('propertyId')).size;
  // add placeholder (empty variation) for second variation
  const canShowSecondVariation = variations.size === 1 && variations.getIn([0, 'options']).size > 0;

  if (variations.size === 0) {
    variations = variations.push(new Map({ options: [] }));
  } else if (canShowSecondVariation) {
    variations = variations.push(new Map({ options: [] }));
  }

  // get statuses for all tabs (needed for tab markers)
  const statuses = fromJS(getPropValue(product, ['_status'], null) || validate(product));

  const hasError = originalLength === 0;
  // gather options for UI
  const variationsStatus = statuses.getIn(['data', 0, 'data', 'variations'], new Map());
  const UiVariations = variations.map((variation, index) => {
    const propertyId = parseInt(variation.get('propertyId'), 10) || null;
    let enhancedVariation = variation.set('propertyId', propertyId);
    const scalingOptionId = variation.get('scalingOptionId') ? parseInt(variation.get('scalingOptionId'), 10) : null;
    // get UI options for variation
    let uiState = getUiState({ taxonomyId, propertyId, scaleId: scalingOptionId, displayName: variation.get('formattedName') });
    // get errors for current settings
    const validity = !!propertyId ? variationsStatus.getIn([index, 'status'], null) : null;
    // set selected flag on options
    uiState = uiState.update('availableOptions', options =>
      options.map(option => option.set('selected', !!option && !!variation.get('options').find(opt => opt.get('value').toLowerCase() === option.get('name').toLowerCase()))));
    // format options values
    enhancedVariation = enhancedVariation.set('options', variation.get('options').map(option => option.set('label', uiState.get('optionFormatter')(option.get('value')))));
    // return variation metadata (info about UI options)
    return new Map({
      key: `${propertyId}.${variation.scalingOptionId}`,
      uiState: uiState,
      variation: enhancedVariation,
      validity,
      taxonomyId,
      canEnableDelete: !!propertyId,
      disabledPropertyId: variations.get(index === 1 ? 0 : 1) && variations.getIn([index === 1 ? 0 : 1, 'propertyId']) ? parseInt(variations.getIn([index === 1 ? 0 : 1, 'propertyId']), 10) : undefined
    });
  });

  return new Map({
    activeTab,
    bulkPreview: false,
    taxonomyData: new Map({
      indexes: fromJS(taxonomyUtils.getIndexes(taxonomyId)),
      values: fromJS(taxonomyUtils.getValues(taxonomyId)),
      options: fromJS(taxonomyUtils.getOptions(taxonomyId))
    }),
    variationsData: new Map({
      variations: UiVariations
    }),
    offeringsData: getOfferingsData(activeTab, new Map({ variations, offerings }), statuses.getIn(['data', activeTab], new Map()), false),
    valid: !hasError && statuses.get('valid', false),
    statuses
  });
};

export const equals = (left, right) => {
  // if product offerings, variations, taxonomy ID and curent active tab are all equal. consider products not changed
  const activeTab = left.getIn(['_formattedVariationsInventory', 'activeTab']) === right.getIn(['_formattedVariationsInventory', 'activeTab']);
  const variations = left.get('variations', new List()).equals(right.get('variations', new List()));
  const offerings = left.get('productOfferings', new List()).equals(right.get('productOfferings', new List()));
  const taxonomyId = (left.get('taxonomyId') || left.get('taxonomy_id')) === (right.get('taxonomyId') || right.get('taxonomy_id'));

  return variations && offerings && taxonomyId && activeTab;
};
