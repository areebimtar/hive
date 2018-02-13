/*
 *
 *     A configured variation is modelled like this:
 *     {
 *        property_id: Number
 *        recipient_id: Number
 *        scale_id: Number
 *        options: [],  // these are the final options on the configuratoin, not the options for the qualifiers
 *     }
 *
 *     Passing in a configuration like that one and a taxonomy ID to getUIState will return an
 *     object with the needed data to fully populate the variation UI. This requires looking up all the possible
 *     properties, qualifiers and suggested options for the current configuration.  The uiState passed back looks like this:
 *
 *     {
 *        selectors: [],   // an array of length 1, 2, or 3 for each dropdown that should be shown
 *        canAcceptOptions: boolean,  // whether or not the variation can have options yet (or do more selections need to happen)
 *        suggestedOptions: []   // a list of suggested options for the options dropdown (might be empty even if canAcceptOptions = true
 *     }
 *
 *     a selector in the selectors array looks like this:
 *     {
 *        type: 'property', 'scale', or 'recpieint',
 *        list: []  an array of objects used to populate the dropdown, each item looks like  {name, value, selected}
 *     }
 * */


import _ from 'lodash';
import 'core-js/fn/array/some';
import { suggestedOptions, propertySets, properties, qualifierOptions } from './data';

import { MAXIMUM_NUMBER_OF_OPTIONS } from '../bulkOpsConstants';
import { requiresRecipient, resolveValidRecipient, resolveValidScale } from './data/propertySets';
import { customProperties } from './data/properties';

const RECIPIENT_QUALIFIER_PROPERTY_ID = 266817057;
const SIZING_SCALE_ID = 300;
const buildSelectors = (taxonomyId, configuration) => {
  const selectors = [];
  const propertySelectors = _.sortBy(_.map(properties.nonCustomProperties, (value) => {
    return {
      name: value.name,
      value: value.property_id
    };
  }), (item) => item.name);

  if (configuration.customProperty) {
    propertySelectors.push(configuration.customProperty);
  }

  selectors.push({ type: 'property', selectedId: configuration.property_id, list: propertySelectors });

  const qualifier = propertySets.getFirstTierQualifier(taxonomyId, configuration.property_id);
  if (qualifier) {
    if (qualifier.property_id === RECIPIENT_QUALIFIER_PROPERTY_ID) {
      let selectedRecipientIdInList = false;
      const recipientQualifiers = _.map(qualifier.options, (optionId) => {
        if (optionId === configuration.recipient_id) {
          selectedRecipientIdInList = true;
        }
        return {
          value: optionId,
          name: qualifierOptions.getPrettyName(optionId)
        };
      });

      selectors.push({ type: 'recipient', selectedId: selectedRecipientIdInList ? configuration.recipient_id : undefined, list: recipientQualifiers });

      if (configuration.recipient_id) {
        const idToLookup = propertySets.deAliasRecipientId(taxonomyId, configuration.recipient_id);
        const scaleOptions = _.get(qualifier, `results.${idToLookup}.options`);
        if (scaleOptions) {
          let selectedIdInList = false;
          const scaleQualifiers = _.map(scaleOptions, (optionId) => {
            if (optionId === configuration.scale_id) {
              selectedIdInList = true;
            }
            return {
              value: optionId,
              name: qualifierOptions.getPrettyName(optionId)
            };
          });
          selectors.push({ type: 'scale', selectedId: selectedIdInList ? configuration.scale_id : undefined, list: scaleQualifiers, scale_type_id: SIZING_SCALE_ID });
        }
      }
    } else {
      let selectedIdInList = false;

      const scaleQualifiers = _.map(qualifier.options, (optionId) => {
        if (optionId === configuration.scale_id) {
          selectedIdInList = true;
        }
        return {
          value: optionId,
          name: qualifierOptions.getPrettyName(optionId)
        };
      });

      selectors.push({ type: 'scale', selectedId: selectedIdInList ? configuration.scale_id : undefined, list: scaleQualifiers, scale_type_id: qualifier.property_id });
    }
  }
  return selectors;
};

const buildSuggestedOptions = (taxonomyId, configuration, optionFormatter) => {
  if (!(taxonomyId && configuration && configuration.property_id)) return [];
  const deAliasedRecipientId = propertySets.deAliasRecipientId(taxonomyId, configuration.recipient_id);
  const opts = _.cloneDeep(suggestedOptions.getSuggestedOptions(configuration.property_id, deAliasedRecipientId, configuration.scale_id));
  if (configuration.options) {
    // format a display name and mark the configured items as selected so we can dim them in the dropdown
    opts.forEach(option => {
      option.prettyName = optionFormatter(option.name, false);
      option.selected = configuration.options.some(configuredOption => parseInt(configuredOption.valueId, 10) === option.property_option_id);
    });
  }

  return opts;
};

const checkIfReadyForOptions = (selectors, configuration) => {
  return selectors.every(selector => selector.selectedId) && (configuration.options === undefined || configuration.options.length < MAXIMUM_NUMBER_OF_OPTIONS);
};

export const buildOptionFormatter = (scaleId, recipientId) => {
  const recipientData = qualifierOptions.getRecipientDataById(recipientId);
  const recipientSuffix = _.get(recipientData, 'prettyName') ? ' - ' + recipientData.prettyName : '';
  const scaleData = qualifierOptions.getScaleDataById(scaleId);
  const scalePrefix = _.get(scaleData, 'prefix') ? scaleData.prefix + ' ' : '';
  const scaleSuffix = _.get(scaleData, 'suffix') ? ' ' + scaleData.suffix : '';

  const formatter = (value) => `${scalePrefix}${value}${scaleSuffix}${recipientSuffix}`;
  return formatter;
};


export const getUIState = (taxonomyId, configuration = {}) => {
  const selectors = buildSelectors(taxonomyId, configuration);
  const optionFormatter = buildOptionFormatter(configuration.scale_id, configuration.recipient_id);
  return {
    selectors: selectors,
    canAcceptOptions: checkIfReadyForOptions(selectors, configuration),
    suggestedOptions: buildSuggestedOptions(taxonomyId, configuration, optionFormatter),
    optionFormatter: optionFormatter
  };
};

export const getRecipientIdFromEnum = qualifierOptions.getRecipientIdFromEnum;
export const getRecipientEnumFromId = qualifierOptions.getRecipientEnumFromId;

export const isRecipientSetViaVariation = (product) => {
  if (!product) { return false; }

  const { taxonomy_id, variations = {} } = product;

  // go though all variations and check wether it has recipient in qualifiers
  // if so, recipient was set via variation and user cannot edit it
  return _.some(variations, variation =>
    propertySets.requiresRecipient(taxonomy_id, parseInt(variation.propertyId, 10)));
};

function reassignCustomPropertyIds(data) {
  const { variations } = data;
  let index = 0;
  _.each(variations, variation => {
    const isCustomProperty = !!_.find(customProperties, { property_id: parseInt(variation.propertyId, 10) });
    if (!variation.propertyId || isCustomProperty) {
      variation.propertyId = customProperties[index++].property_id;
    }
  });
}

export const updateVariationInPair = (pair, index, data) => {
  const taxonomyId = parseInt(pair.taxonomyId, 10);

  // if variation is null, delete
  if (!data) {
    pair.variations.splice(index, 1);
    if (pair.variations.length) {
      pair.variations[0].first = true;
      reassignCustomPropertyIds(pair.variations);
    }

    // if there is no variation which requires recipient, we need to remove it (set to null)
    const isRecipientRequired = _.some(pair.variations, variation => requiresRecipient(taxonomyId, variation.propertyId));
    if (!isRecipientRequired) {
      pair.recipient = null;
    }
    return pair;
  }
  // if propertyId is null, this is just a dummy variation and we can skip it
  const propertyId = _.get(data, 'variation.propertyId');
  const isCustomProperty = _.get(data, 'variation.isCustomProperty');
  if (propertyId || isCustomProperty) {
    const correctedRecipientId = resolveValidRecipient(taxonomyId, propertyId, data.recipientId);
    const correctedScaleId = resolveValidScale(taxonomyId, propertyId, data.variation.scalingOptionId, correctedRecipientId);

    const updatedVariation = data.variation;
    updatedVariation.scalingOptionId = correctedScaleId;
    pair.variations[index] = updatedVariation;

    // if there is at least one variation which requires recipient, we need to update/keep current recipient
    // otherwise we need to remove it (set to null)
    const isRecipientRequired = _.some(pair.variations, variation => requiresRecipient(taxonomyId, variation.propertyId));
    pair.recipient = isRecipientRequired ? getRecipientEnumFromId(data.recipientId) || pair.recipient : null;

    reassignCustomPropertyIds(pair);
    return pair;
  }
  return pair; // TODO: what should be returned here?
};

export const insertOptions = (options, configuredOptions = [], suggestedOptions = []) => { // eslint-disable-line no-shadow
  const resultOptions = _.cloneDeep(configuredOptions);
  options.forEach(option => {
    const alreadyAdded = resultOptions.some(existingOption => existingOption.value.toLowerCase() === option.value.toLowerCase());
    if (!alreadyAdded) {
      option.id = Math.min(0, Math.min.apply(Math, resultOptions.map(newVariationOption => newVariationOption.id))) - 1;

      // get current option index in suggested options
      const optionIndex = _.findIndex(suggestedOptions, { name: option.value });
      // custom option? push it at the end
      if (optionIndex === -1) {
        return resultOptions.push(option);
      }

      // get distances from already added option with respect to sugessted option
      // and filter out indexes which are not positive (options which are before currently inserted one)
      // if result is enpty array, push it to the end
      const indexes = _.map(resultOptions, newOption => _.findIndex(suggestedOptions, { name: newOption.value }) - optionIndex).filter(index => index >= 0);
      if (!indexes.length) {
        return resultOptions.push(option);
      }
      // find closest suggested option index
      const nextSuggestedOptionindex = Math.max(0, optionIndex + Math.min(...indexes));
      const nextOptionIndex = _.findIndex(resultOptions, { value: suggestedOptions[nextSuggestedOptionindex].name });
      // we will push before next option
      resultOptions.splice(nextOptionIndex, 0, option);
    }
    return true;
  });

  return resultOptions;
};
