import _ from 'lodash';
import { Map, List } from 'immutable';

import * as BULKEDIT_CONSTANTS from '../bulkOpsConstants';
import { getOptionFormatter } from '../attributes/taxonomyNodeProperties';
import getGUID from '../../../../shared/guid';

const isInfluencingAll = (variations = new List(), influencesType) => {
  if (!influencesType) { return true; }
  return variations.reduce((result, variation) => result + !!variation.get(influencesType, false), 0) === 2; // variations.size;
};

export const isGlobal = (variations = new List(), influencesType) => {
  if (!influencesType) { return false; }
  return !variations.reduce((result, variation) => result || variation.get(influencesType), false);
};

function getCombinations(options = new List()) {
  const dimension = options.size;
  const lengths = options.map(option => option.size).toJS();
  const numRows = lengths.reduce((total, length) => total * (length || (lengths.size > 1 ? 1 : 0)), 1);
  const counters = _.fill(Array(dimension), 0);
  let result = new List();

  if (!dimension) { return new List(); }

  let j;
  let i = 0;
  while (i < numRows) {
    result = result.push(new List(_.map(counters, (count, index) => options.getIn([index, count]))));

    j = dimension - 1;
    do {
      counters[j] = counters[j] + 1;
      if (counters[j] !== lengths[j]) {
        break;
      }

      counters[j] = 0;
      j--;
    } while (j >= 0);

    i++;
  }

  return result;
}

function offeringKey(options) {
  return options.map(option => option.get('optionId')).join('#');
}

const getInfluencingData = (variations, offerings, influencesType) => {
  const variation = variations.find(item => !!item.get(influencesType)) || new Map();
  return {
    isGlobal: isGlobal(variations, influencesType),
    influencesAll: isInfluencingAll(variations, influencesType),
    optionIndex: offerings.getIn([0, 'variationOptions'], new List()).findIndex(item => item.get('variationId') === variation.get('id'))
  };
};

function updateValues(property, influencesProperty, variations, offerings, oldVariations, oldOfferings, defaultValue = null) {
  const influencingData = getInfluencingData(variations, offerings, influencesProperty);
  const oldInfluencingData = getInfluencingData(oldVariations, oldOfferings, influencesProperty);

  // property (price/quantity/sku) has global value
  if (influencingData.isGlobal) {
    const offeringWithValue = oldOfferings.find(offering => !!offering.get(property));
    const value = offeringWithValue ? offeringWithValue.get(property) : defaultValue;
    return offerings.map(offering => offering.set(property, value));
  }
  // property (price/quantity/sku) is influenced only by one variation
  if (!influencingData.influencesAll && !oldInfluencingData.influencesAll) {
    // create map of option from influencing variation
    const oldValuesMap = oldOfferings.reduce((map, offering) => {
      return _.set(map, offering.getIn(['variationOptions', influencingData.optionIndex, 'optionId']), offering.get(property, defaultValue));
    }, {});
    // set values
    return offerings.map(offering => offering.set(property, _.get(oldValuesMap, offering.getIn(['variationOptions', influencingData.optionIndex, 'optionId']), defaultValue)));
  }

  // property (price/quantity/sku) is influenced by both variations (eg we have full list of combinations)
  // create map based on both option ids
  const oldValuesMap = oldOfferings.reduce((map, offering) => {
    return _.set(map, offeringKey(offering.get('variationOptions')), offering.get(property, defaultValue));
  }, {});
  // set values
  return offerings.map(offering => offering.set(property, _.get(oldValuesMap, offeringKey(offering.get('variationOptions')), defaultValue)));
}

function updateVisibility(variations, offerings, oldOfferings) {
  const influencingProperties = ['influencesPrice', 'influencesQuantity', 'influencesSku'];
  const combinedList = _.reduce(influencingProperties, (result, influencingProperty) =>
    result || isInfluencingAll(variations, influencingProperty), false);

  // we have one or two separate lists
  if (!combinedList) {
    const getKey = option => option.get('variationId') + '#' + option.get('optionId');
    // create map of all variations options visibilities
    // if combination is visible, than both options must be visible as well.
    // rest of the options are not visible
    const map = oldOfferings.reduce((allOptionsMap, offering) => {
      const visibility = offering.get('visibility', true);
      if (visibility) {
        return offering
          .get('variationOptions', new List())
          .reduce((optionsMap, option) => optionsMap.set(getKey(option), true), allOptionsMap);
      } else {
        return offering
          .get('variationOptions', new List())
          .reduce((optionsMap, option) => {
            const key = getKey(option);
            const optionVisible = optionsMap.get(key, false);
            if (!optionVisible) {
              return optionsMap.set(key, false);
            }
            return optionsMap;
          }, allOptionsMap);
      }
    }, new Map());

    // set visibilities
    return offerings.map(offering => {
      const visibility = offering
        .get('variationOptions', new List())
        .reduce((result, option) => result && map.get(getKey(option), true), true);
      return offering.set('visibility', visibility);
    });
  }

  const oldValuesMap = oldOfferings.reduce((map, offering) => {
    return _.set(map, offeringKey(offering.get('variationOptions')), offering.get('visibility', true));
  }, {});
  // set values
  return offerings.map(offering => offering.set('visibility', _.get(oldValuesMap, offeringKey(offering.get('variationOptions')), true)));
}

export function getOfferings(newValue) {
  // get new variations
  const variations = newValue.get('variations', new List()).map(variation => {
    const formatter = getOptionFormatter(variation.get('scalingOptionId'));
    return variation.update('options', options => options.map(option => option.set('label', formatter(option.get('value')))));
  }).toList();
  // get old variations
  const oldVariations = newValue.getIn(['oldValue', 'variations'], new List());
  // get old offerings (basically current offerings, the ones before we add/remove options)
  const oldOfferings = newValue.get('offerings', new List());
  // their options
  const options = variations.map(variation => variation.get('options').map(option => new Map({ optionId: option.get('id'), variationId: variation.get('id') }))).filter(item => !!item.size);
  // and calulate permutations between all options
  let offerings = !variations.size ? newValue.get('offerings', new List()) : getCombinations(options);
  // copy price, quantity and SKU from previous value
  offerings = offerings.map((offering) => new Map({
    id: offering.get('id') || -getGUID(),
    variationOptions: offering
  }));

  // update price
  offerings = updateValues('price', 'influencesPrice', variations, offerings, oldVariations, oldOfferings);
  offerings = updateValues('quantity', 'influencesQuantity', variations, offerings, oldVariations, oldOfferings);
  offerings = updateValues('sku', 'influencesSku', variations, offerings, oldVariations, oldOfferings);
  offerings = updateVisibility(variations, offerings, oldOfferings);

  return offerings;
}

function isInfluencingType(type, variation) {
  // for visibility tab, always return true as we allow editing all variations at once
  if (type === BULKEDIT_CONSTANTS.INVENTORY_TYPE_VISIBILITY) {
    return true;
  }

  // return influences flag for given type
  const influencesType = BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES_INFLUENCE[type];
  return !!variation.get(influencesType);
}

function getNumOfInfluences(type, variations) {
  // for visibility tab, return number of variations if any of the influences
  // flags is set on both variations (eg both checkboxes on same tab) to ensure that we will show combination list.
  // for any other combination return 0 (to ensure that we will show separate lists).
  if (type === BULKEDIT_CONSTANTS.INVENTORY_TYPE_VISIBILITY) {
    return _.reduce(BULKEDIT_CONSTANTS.INFLUENCING_TYPES, (influencingTypes, key) =>
      influencingTypes || variations.reduce((influencingVariations, variation) =>
        influencingVariations && isInfluencingType(key, variation), true), false) ? variations.size : 0;
  }

  // for other tabs, count how many times given influences flag is set to true
  return variations.reduce((totalCount, variation) =>
    totalCount + (isInfluencingType(type, variation) ? 1 : 0), 0);
}

function getValue(type, value) {
  // helper function for handling default values.
  // visibility tab: boolean (true)
  // all other tabs: if number than its value or string ('')
  if (type === BULKEDIT_CONSTANTS.INVENTORY_TYPE_VISIBILITY) {
    return _.isBoolean(value) ? value : true;
  }
  return _.isFinite(value) ? value : value || '';
}

function isVisible(type, offering, isSingle, combination = null, allOfferings) {
  // if we are on visibility tab, always show option
  if (type === BULKEDIT_CONSTANTS.INVENTORY_TYPE_VISIBILITY) {
    return true;
  }

  // if we are on tab showing all combinations, use visibility flag directly
  if (!isSingle) {
    return !!getValue(type, offering.get('visibility'));
  }

  // we are showing single variation list, we need to check all offerings with given combination
  // if at least one is visible, we need to show the combination
  const filteredOfferings = allOfferings.filter(o =>
    o.get('variationOptions').find(c => (c.get('variationId') === combination.get('variationId') && c.get('optionId') === combination.get('optionId'))));
  const visibilities = filteredOfferings.filter(o => o.get('visibility'));
  return !!filteredOfferings.size && !!visibilities.size;
}

function getCheckboxes(type, variations) {
  const influencesType = BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES_INFLUENCE[type];

  // do not show checkboxes for visibility tab
  if (type === BULKEDIT_CONSTANTS.INVENTORY_TYPE_VISIBILITY) {
    return new List();
  }

  return variations.map(variation => new Map({
    id: variation.get('id'),
    checked: variation.get(influencesType) || false,
    disabled: !variation.get('options', new List()).size,
    label: BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES_CHECKBOX_MSG[type]
  }));
}

function unique(list) {
  const set = {};
  const result = [];
  list.forEach(item => {
    if (!set[item]) {
      set[item] = true;
      result.push(item);
    }
  });
  return new List(result);
}

function getSingleVariationList(type, variation, offerings, status = new List()) {
  const typeName = BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES[type];
  let optionOfferingsMap = new Map();
  const optionsMap = variation.get('options').reduce((opts, option) => opts.set(option.get('id'), option), new Map());
  const offeringsWithStatus = offerings.map((offering, index) => offering.set('status', status.get(index, null)));
  const list = offeringsWithStatus.reduce((res, offering) => {
    const onlyForVariation = offering.get('variationOptions').filter(option => option.get('variationId') === variation.get('id'));
    const optionsIds = unique(onlyForVariation.map(item => item.get('optionId')));
    optionOfferingsMap = optionsIds.reduce((map, id) => map.set(id, offering.set('visibility', map.getIn([id, 'visibility']) || offering.get('visibility'))), optionOfferingsMap);
    return unique(res.concat(optionsIds));
  }, new List());

  return list.map(id => new Map({
    value: getValue(type, optionOfferingsMap.getIn([id, typeName])),
    _formattedValue: optionOfferingsMap.getIn([id, '_formattedValue'], null),
    showValue: false,
    status: optionOfferingsMap.getIn([id, 'status'], null),
    visible: isVisible(type, optionOfferingsMap.get(id), true, new Map({optionId: optionsMap.getIn([id, 'id'], null), variationId: variation.get('id')}), offerings),
    combination: new List([new Map({
      optionId: id,
      option: optionsMap.get(id),
      variation,
      variationId: variation.get('id'),
      showValue: isInfluencingType(type, variation)
    })])
  }));
}

function getCombinationsList(type, variations, offerings, status = new List()) {
  const typeName = BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES[type];
  const variationsMap = variations.reduce((vars, variation) => vars.set(variation.get('id'), variation), new Map());
  const variationOptionsMap = variations.reduce((vars, variation) =>
    vars.set(variation.get('id'), variation.get('options').reduce((opts, option) => opts.set(option.get('id'), option), new Map())), new Map());

  return offerings.map((offering, index) => (new Map({
    value: getValue(type, offering.get(typeName)),
    _formattedValue: offering.get('_formattedValue', null),
    showValue: true,
    status: status.get(index, null),
    visible: isVisible(type, offering, false),
    combination: offering.get('variationOptions').map(option => (new Map({
      optionId: option.get('optionId'),
      variationId: option.get('variationId'),
      option: variationOptionsMap.getIn([option.get('variationId'), option.get('optionId')]),
      variation: variationsMap.get(option.get('variationId')),
      showValue: false
    })))
  })));
}

function getOfferingsColumns(type, variations, offerings, status) {
  const numOfInfluences = getNumOfInfluences(type, variations);
  const allModifies = variations.size > 1 ? numOfInfluences === variations.size : false;

  if (!allModifies) {
    if (!variations.size) {
      return new List([new Map({
        headers: new List([]),
        items: new List([new Map({
          value: getValue(type, offerings.getIn([0, type])),
          _formattedValue: getValue(type, offerings.getIn([0, '_formattedValue'])),
          showValue: true,
          status: status.get(0, ''),
          combination: new List([])
        })])
      })]);
    }
    return variations.map(variation => (new Map({
      headers: new List([variation.get('formattedName')]),
      items: getSingleVariationList(type, variation, offerings, status)
    })));
  }

  return new List().set(0, new Map({
    headers: variations.map(variation => variation.get('formattedName')),
    items: getCombinationsList(type, variations, offerings, status)
  }));
}

export function getOfferingsList(type, product) {
  const typeName = BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES[type];
  const variations = product.get('variations', new List()).map(variation => {
    const formatter = getOptionFormatter(variation.get('scalingOptionId'));
    return variation.update('options', options => options.map(option => option.set('label', formatter(option.get('value')))));
  }).toList();
  const offerings = product.get('productOfferings', new List());
  const numOfInfluences = getNumOfInfluences(type, variations);
  const allModifies = variations.size > 1 ? numOfInfluences === variations.size : false;

  const status = product.getIn(['_status', 'data'], new Map({status: null, offerings: new List()}));
  const columns = getOfferingsColumns(type, variations, offerings, status.get('offerings'));

  if (!variations.size) {
    return new Map({
      showValue: true,
      value: getValue(type, offerings.getIn([0, typeName])),
      _formattedValue: getValue(type, offerings.getIn([0, '_formattedValue'])),
      status: status && status.getIn(['offerings', 0]),  // global status
      globalStatus: status && status.get('status'),
      items: new List()
    });
  }

  if (numOfInfluences === 0) {
    // all values are same
    return new Map({
      showValue: true,
      value: columns.getIn([0, 'items', 0, 'value'], ''), // global value
      _formattedValue: columns.getIn([0, 'items', 0, '_formattedValue'], ''), // global _formattedValue
      status: status && status.getIn(['offerings', 0], null),  // global status
      globalStatus: status && status.get('status'),
      items: new List()
    });
  }

  if (!allModifies) {
    // only values for influenced property will be shown, other properties (in combinations) will have value from these properties
    const influencingIndex = variations.findIndex(variation => isInfluencingType(type, variation));
    return new Map({
      showValue: false,
      value: null,
      _formattedValue: null,
      status: null,
      globalStatus: status && status.get('status'),
      items: columns.getIn([influencingIndex, 'items']).map(item =>
        item.update('combination', combinations => combinations.filter(combination => !!combination.get('showValue'))))
    });
  }

  return new Map({
    // show all possible combinations and let user to fill in value for any combination
    showValue: false,
    value: null,
    _formattedValue: null,
    status: null,
    globalStatus: status.get('status'),
    items: columns.map(column => column.get('items')).get(0).filter(item => !item.get('combination').isEmpty())
  });
}

export function getOfferingsData(type, newValue = new Map(), status = new List(), needsRecalculatedOfferings) {
  const typeData = BULKEDIT_CONSTANTS.INVENTORY_TABS_TYPES_DATA[type];
  if (!typeData) { return null; }

  const influencesType = typeData.influence;

  const variations = newValue.get('variations', new List()).map(variation => {
    const formatter = getOptionFormatter(variation.get('scalingOptionId'));
    return variation.update('options', options => options.map(option => option.set('label', formatter(option.get('value')))));
  }).toList();
  const offerings = needsRecalculatedOfferings ? getOfferings(newValue) : newValue.get('offerings', new List());
  const numOfInfluences = getNumOfInfluences(type, variations);
  const showGlobalValue = type !== BULKEDIT_CONSTANTS.INVENTORY_TYPE_VISIBILITY && numOfInfluences === 0;
  return new Map({
    type: typeData.code,
    influencesType,
    columns: getOfferingsColumns(type, variations.filter(variation => !!variation.get('id')), offerings, status.getIn(['data', 'offerings'], new List())),
    offerings,
    variations,
    showGlobalValue,
    globalValue: offerings.getIn([0, typeData.code], '') || '',
    globalValueLabel: typeData.globalLabel,
    globalValueStatus: showGlobalValue && status.getIn(['data', 'offerings', 0], ''),
    globalStatus: status.getIn(['data', 'status'], null),
    numOfInfluences,
    checkboxes: getCheckboxes(type, variations)
  });
}
