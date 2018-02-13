import _ from 'lodash';
import { List, Map } from 'immutable';
import { validatePrice } from './priceInventory';
import { validateSku } from './skuInventory';
import { validateQuantity, validateQuantities } from './quantityInventory';

import { MAXIMUM_OPTION_NAME_LENGTH, MAXIMUM_CUSTOM_PROPERTY_NAME_LENGTH,
  MAXIMUM_NUMBER_OF_OPTIONS, MAXIMUM_VARIATION_OPTION_COMBINATION_COUNT } from '../../bulkOpsConstants';
import { FIELDS } from '../../constants';

import { validateTaxonomy } from '../../attributes/taxonomyNodeProperties';

export const validateProductLevelVariations = (variations = new List()) => {
  if (variations.size === 2) {
    const firstPropertyId = variations.getIn([0, 'propertyId']);
    const secondPropertyId = variations.getIn([1, 'propertyId']);
    if (firstPropertyId && secondPropertyId && parseInt(firstPropertyId, 10) === parseInt(secondPropertyId, 10)) {
      return 'Must have unique properties for each variation';
    }
  }
  const influencesTypes = ['influencesPrice', 'influencesQuantity', 'influencesSku'];
  const hasAllInfluences = _.reduce(influencesTypes, (result, influencesType) => result || !variations.find(variation => !variation.get(influencesType, false)), false);
  if (hasAllInfluences) {
    const combinations = variations.reduce((result, variation) => result * variation.get('options', new List()).size, 1);
    if (combinations > MAXIMUM_VARIATION_OPTION_COMBINATION_COUNT) {
      return `Use at most ${MAXIMUM_VARIATION_OPTION_COMBINATION_COUNT} variation combinations`;
    }
  }
  return null;
};

export const validateVariation = (variation = new Map(), taxonomyId) => {
  const validProperties = validateTaxonomy(taxonomyId, variation.get('propertyId', null), variation.get('scalingOptionId', null), true);

  if (!validProperties) { return 'Choose a valid property/scale combination'; }

  const optionsSize = variation.get('options', new List()).size;
  if (optionsSize > MAXIMUM_NUMBER_OF_OPTIONS) {
    return `Must have at most ${MAXIMUM_NUMBER_OF_OPTIONS} options`;
  }

  if (!optionsSize) {
    return 'Must have at least one option';
  }
  return null;
};

const validateCustomPropertyOrOptionName = (value, maxLength) => {
  if (/[\^\$\`]/.test(value)) {
    return 'You may not include any of these characters: ^ $ `';
  }
  if (value.length > maxLength) {
    return `Must be shorter than ${maxLength} chars`;
  }
  return null;
};

export const validateOption = value => validateCustomPropertyOrOptionName(value, MAXIMUM_OPTION_NAME_LENGTH);

export const validateCustomProperty = value => validateCustomPropertyOrOptionName(value, MAXIMUM_CUSTOM_PROPERTY_NAME_LENGTH);

const validateOfferingsVisibility = (offerings = new List()) => {
  // validate visibility
  const visible = offerings.filter(offering => offering.get('visibility'));
  const valid = offerings.size === 0 || !!visible.size;
  return valid ? null : 'At least one offering must be visible';
};

const validateVariations = (variations = new List(), taxonomyId) => {
  const errors = new Map({
    status: validateProductLevelVariations(variations),
    variations: variations.map(variation => new Map({
      status: validateVariation(variation, taxonomyId),
      options: variation.get('options').map(option => validateOption(option.get('value')))
    }))
  });

  return new Map({
    valid: !(!!errors.get('status') || !!errors.get('variations').find(variation => variation.get('status') || !!variation.get('options').find(option => !!option))),
    data: errors
  });
};

const validateAllOfferings = (offerings = new List()) => {
  // if there are no offerings do not throw validation error, it is handled on variation level
  if (!offerings.size) { return null; }

  // validate unique combinations of offerings
  const allCombinations = offerings.map(offering =>
    offering.get('variationOptions', new List()).map(option => option.get('variationId') + '#' + option.get('optionId')).join('-'));
  if (allCombinations.toSet().toList().size !== offerings.size) {
    return 'Must have unique combinations of options';
  }

  return null;
};

const validateOffering = (offering = new Map(), type, validator, ignoreEmpty) => {
  // validate price, quantity and sku
  const status = validator ? validator(offering.get(type), ignoreEmpty) : null;
  if (status) {
    return status;
  }

  // validate options
  const options = offering.get('variationOptions', new List());
  if (options.toSet().toList().size !== options.size) {
    return 'Must have unique combination of options';
  }

  return null;
};


const offeringValidators = {
  price: {
    single: validatePrice
  },
  quantity: {
    single: validateQuantity,
    group: validateQuantities
  },
  sku: {
    single: validateSku
  },
  visibility: {
    group: validateOfferingsVisibility
  }
};


const validateOfferings = (offerings = new List(), type, ignoreEmptyGlobalValue = false) => {
  const singleValidator = _.get(offeringValidators, `${type}.single`, () => null);
  const groupValidator = _.get(offeringValidators, `${type}.group`, () => null);
  const offeringStatusArray = offerings.map((offering) => validateOffering(offering, type, singleValidator, ignoreEmptyGlobalValue));
  const individualOfferingsValid = !offeringStatusArray.find(offering => !!offering);
  let overallStatus = validateAllOfferings(offerings);
  if (individualOfferingsValid && !overallStatus) {
    overallStatus = groupValidator(offerings, ignoreEmptyGlobalValue);
  }

  return new Map({
    valid: !overallStatus && individualOfferingsValid,
    data: new Map({
      status: overallStatus,
      offerings: offeringStatusArray
    })
  });
};

export const isGlobal = (variations, influencesType) => {
  return !variations.reduce((result, variation) => result || variation.get(influencesType, false), false);
};

function getValidResponse() {
  return new Map({
    valid: true,
    data: new List(_.fill(Array(5), new Map({valid: true, data: null}))) // create List of 5 items
  });
}

export const validateVariationsAndOfferings = (variations = new List(), offerings = new List(), ignoreEmptyGlobalValue = false, taxonomyId = null) => {
  const variationsWithPropertyId = variations.filter(variation => !!variation.get('propertyId'));

  if (!variationsWithPropertyId.size) {
    return getValidResponse();
  }

  const statuses = new List([
    validateVariations(variationsWithPropertyId, taxonomyId),
    validateOfferings(offerings, 'price', ignoreEmptyGlobalValue && isGlobal(variationsWithPropertyId, 'influencesPrice')),
    validateOfferings(offerings, 'quantity', ignoreEmptyGlobalValue && isGlobal(variationsWithPropertyId, 'influencesQuantity')),
    validateOfferings(offerings, 'sku', isGlobal(variationsWithPropertyId, 'influencesSku')),
    validateOfferings(offerings, 'visibility', false)
  ]);

  return new Map({
    valid: !statuses.find(status => !status.get('valid')),
    data: statuses
  });
};

export const validate = (product) => {
  if (product.has('variations') && product.has('productOfferings') && product.get(FIELDS.CAN_WRITE_INVENTORY)) {
    const taxonomyId = product.get('taxonomyId', null) || product.get('taxonomy_id', null);
    const plainVariations = product.get('variations');
    const plainOfferings = product.get('productOfferings');
    const plainVariationsAsArray = plainVariations.toList();
    return validateVariationsAndOfferings(plainVariationsAsArray, plainOfferings, false, taxonomyId);
  }
  return getValidResponse();
};
