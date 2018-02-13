import data from './data';
import { fromJS, Map, List } from 'immutable';
import _ from 'lodash';

const REFERENCE_DATA = {
  standardProperties: fromJS(data.STANDARD_PROPERTIES),
  taxonomySpecificProperties: fromJS(data.TAXONOMY_SPECIFIC_PROPERTIES),
  scalesLookups: fromJS(data.SCALES_LOOKUP),
  optionsLookups: fromJS(data.SUGGESTED_OPTIONS_LOOKUP),
  commonPropertyIds: fromJS(data.COMMON_PROPERTIES.COMMON_PROPERTY_IDS)
};


const VELA_PROPERTY_OVERRIDES = {
  200: { displayName: 'Color (primary)'},
  52047899002: { displayName: 'Color (secondary)'}
};

export const CUSTOM_PROPERTY_IDS = fromJS([ 513, 514 ]);

function expandOptions(optionIds, propertyId, scaleId = null) {
  const propertyKey = String(propertyId);
  const scaleKey = scaleId ? String(scaleId) : 'none';
  const allPossibleOptions = REFERENCE_DATA.optionsLookups.getIn([propertyKey, scaleKey], new List());
  return optionIds.map((optionId) => allPossibleOptions.find(option => option.get('id') === optionId));
}

function getStandardOptionIdsForScale(scaleId) {
  return REFERENCE_DATA.scalesLookups.getIn([String(scaleId), 'suggestedOptionIds'], null);
}

export function getCustomPropertyIds() {
  return CUSTOM_PROPERTY_IDS.toJS();
}

export function getPropertyData(propertyId) {
  return REFERENCE_DATA.standardProperties.toJS()[propertyId];
}

export function getScaleData(scaleId) {
  return REFERENCE_DATA.scalesLookups.toJS()[scaleId];
}

export function getOptionFormatter(scaleId) {
  const scaleData = getScaleData(scaleId);
  return (value = '') => scaleData ? `${value} ${scaleData.name}` : value;
}

function getAvailablePropertyIds(taxonomyId) {
  if (!taxonomyId) {
    // return all standard properties
    return REFERENCE_DATA.standardProperties.keySeq().toList();
  }

  const taxonomySpecificData = REFERENCE_DATA.taxonomySpecificProperties.get(String(taxonomyId), new Map());
  const commonPropertyIds = REFERENCE_DATA.commonPropertyIds.filter(id => !_.get(VELA_PROPERTY_OVERRIDES, `[${id}].omit`));
  return commonPropertyIds
    .filter(propertyId => !taxonomySpecificData.get('missingProperties', new List()).includes(propertyId))
    .concat(taxonomySpecificData.get('extraProperties'));
}

function getAvailableScaleIds(taxonomyId, propertyId) {
  const taxonomySpecificData = REFERENCE_DATA.taxonomySpecificProperties.get(String(taxonomyId), new Map());
  const standardData = REFERENCE_DATA.standardProperties;

  const overridePropertyData = taxonomySpecificData.getIn(['overrides', String(propertyId)], new Map());
  const standardPropertyData = standardData.get(String(propertyId), new Map());
  const extraScaleIds = overridePropertyData.get('extraScales', new List());
  const missingScaleIds = overridePropertyData.get('missingScales', new List());
  const standardScaleIds = standardPropertyData.get('scaleIds', new List());
  return standardScaleIds.filter((scaleId) => !missingScaleIds.includes(scaleId)).concat(extraScaleIds);
}

export function validateTaxonomy(taxonomyId, propertyId, scaleId, checkScaleId = false) {
  // taxonomy ID must be number
  if (!_.isFinite(taxonomyId) && (!_.isString(taxonomyId) || !taxonomyId)) { return false; }
  // fail if property ID is not on the list of avalable properties for given taxonomy ID
  const availablePropertyIds = getAvailablePropertyIds(taxonomyId);
  if (!availablePropertyIds.includes(parseInt(propertyId, 10))) { return false; }
  // fail if scale ID is not on the list of available scales for given property ID
  const availableScaleIds = getAvailableScaleIds(taxonomyId, propertyId);
  if (availableScaleIds.size && checkScaleId) {
    return availableScaleIds.includes(parseInt(scaleId, 10));
  } else if (scaleId && !availableScaleIds.includes(parseInt(scaleId, 10))) { return false; }
  // do not check option IDs
  return true;
}

// input: { taxonomyId, propertyId, scaleId }
// output:  see result object
function getUiStateForAttributesOrVariations(config = {}, forVariations = true) {
  const propertiesKey = forVariations ? 'availableVariations' : 'availableAttributes';

  let result = new Map({
    [propertiesKey]: new List(),
    availableScales: new List(),
    availableOptions: new List(),
    readyForOptions: false,
    optionFormatter: getOptionFormatter(config.scaleId)
  });

  if (!config.taxonomyId) {
    return result;
  }
  const taxonomyKey = String(config.taxonomyId);
  const taxonomySpecificData = REFERENCE_DATA.taxonomySpecificProperties.get(taxonomyKey, new Map());
  const standardData = REFERENCE_DATA.standardProperties;

  const availablePropertyIds = getAvailablePropertyIds(taxonomyKey);

  const getCustomDisplayName = (propertyId) => {
    return _.get(VELA_PROPERTY_OVERRIDES, `${propertyId}.displayName`, false) ||
      taxonomySpecificData.getIn(['overrides', String(propertyId), 'displayName'], false);
  };

  const customProperties = CUSTOM_PROPERTY_IDS;

  // now expand the property and scales
  const allAvailableProperties = availablePropertyIds.map(propertyId => {
    const commonPropertyData = standardData.get(String(propertyId), new Map());
    const isCustomProperty = customProperties.indexOf(propertyId) !== -1;

    if (isCustomProperty && config.propertyId !== propertyId) { return null; }

    return new Map({
      id: propertyId,
      name: isCustomProperty ? config.displayName : commonPropertyData.get('name'),
      required: commonPropertyData.get('required'),
      attributes: commonPropertyData.get('attributes'),
      variations: commonPropertyData.get('variations'),
      displayName: isCustomProperty ? config.displayName : getCustomDisplayName(propertyId) || commonPropertyData.get('displayName')
    });
  })
  .filter(property => !!property);

  // sort by display name
  const sortedProperties = allAvailableProperties
    .sort((left, right) => {
      const lval = (left.get('displayName') || '').toLowerCase();
      const rval = (right.get('displayName') || '').toLowerCase();
      if (lval < rval) { return -1; }
      if (lval > rval) { return 1; }
      return 0;
    });
  // filter for attributes or variations
  const filterKey = forVariations ? 'variations' : 'attributes';
  result = result.set(propertiesKey, sortedProperties.filter(property => !!property.get(filterKey)));

  // if there's no propertyId chosen, we're done
  if (!config.propertyId) {
    return result;
  }

  // if the property is not supported for the taxonomy, we're done
  if (!result.get(propertiesKey).find(item => String(item.get('id')) === String(config.propertyId))) {
    return result;
  }

  const availableScaleIds = getAvailableScaleIds(taxonomyKey, config.propertyId);

  // expand to the full scale definitions. NOTE: Unlike property info, the names of scales are never overridden
  result = result.set('availableScales', availableScaleIds.map(scaleId => REFERENCE_DATA.scalesLookups.get(String(scaleId), new Map())));

  // Determine if the configuration is complete enough for options and if so, populate the optionis
  const readyForPropertyLevelOptions = !!(config.taxonomyId && config.propertyId && result.get('availableScales', new List()).size === 0);
  const readyForScaleLevelOptions = !!(config.taxonomyId && config.propertyId && result.get('availableScales', new List()).size > 0 && config.scaleId);
  let availableOptionIds = new List();

  if (readyForPropertyLevelOptions) {
    availableOptionIds = taxonomySpecificData.getIn(['overrides', String(config.propertyId), 'suggestedOptionIds']) || standardData.getIn([String(config.propertyId), 'suggestedOptionIds']) || new List();
  } else if (readyForScaleLevelOptions) {
    availableOptionIds =
      taxonomySpecificData.getIn(['overrides', String(config.propertyId), 'scales', String(config.scaleId), 'suggestedOptionIds']) ||
      getStandardOptionIdsForScale(config.scaleId) ||
      new List();
  }

  // for attributes at the property level, we might have required or pre-selected choices:
  if (readyForPropertyLevelOptions  && !forVariations) {
    const selectedValueIds = taxonomySpecificData.getIn(['overrides', String(config.propertyId), 'selectedValueIds']) || standardData.getIn([String(config.propertyId), 'selectedValueIds']) || new List();
    const required = taxonomySpecificData.getIn(['overrides', String(config.propertyId), 'required']) || standardData.getIn([String(config.propertyId), 'required']) || false;
    result = result.set('required', required);

    // NOTE: weird Etsy logic-- if an attributed is required and selected values are provided,
    // then the suggested option list is ignored and replaced with the selected values.  As an example
    // look at the Occasion attribute on taxonomy 1242 or 1243...
    if (required && selectedValueIds.size) {
      availableOptionIds = selectedValueIds;
    }
  }

  result = result
    .set('readyForOptions', readyForPropertyLevelOptions || readyForScaleLevelOptions)
    .set('availableOptions', expandOptions(availableOptionIds, config.propertyId, config.scaleId));

  return result;
}

export function getUiState(config = {}) {
  return getUiStateForAttributesOrVariations(config, true);
}

export function getUiStateForAttributes(config = {}) {
  // supply a dummy taxonomy ID for attributes to populate the bulk options
  if (!config.taxonomyId) {
    config.taxonomyId = -1;
  }
  return getUiStateForAttributesOrVariations(config, false);
}

let attributesMap = new Map();
const getAttributePropertyId = (attributeName) => {
  if (attributesMap.get(attributeName)) { return attributesMap.get(attributeName); }

  const { standardProperties } = REFERENCE_DATA;
  const propertiesList = standardProperties.map((value, key) => value.set('id', key));
  const attribute = propertiesList.find(item => item.get('name', '').toLowerCase() === attributeName.toLowerCase());

  const attributeId = attribute ? attribute.get('id', null) : null;
  attributesMap = attributesMap.set(attributeName, attributeId);

  return attributeId;
};

function capitalize(text) {
  if (!_.isString(text)) { return text; }
  const words = text.split(/[\s]/);
  return words.map(word => _.capitalize(word)).join(' ');
}

let attributeCache = new Map();
export function getAttribute(attributeName, taxonomyId = -1, scaleId = null) {
  const propertyId = getAttributePropertyId(attributeName);
  const config = { taxonomyId, propertyId, scaleId };

  // check cache
  const key = _.pairs(config).map(pair => pair.join(':')).join('#');
  if (!attributeCache.has(key)) {
    let result = getUiStateForAttributesOrVariations(config, false);
    result = result.update('availableOptions', availableOptions => availableOptions.map(option => option.update('name', name => capitalize(name))));
    attributeCache = attributeCache.set(key, result);
  }

  return attributeCache.get(key);
}

export function getAttributeWithNone(attributeName, taxonomyId = -1, scaleId = null) {
  const result = getAttribute(attributeName, taxonomyId, scaleId);
  let availableOptions = result.get('availableOptions', new List());
  if (availableOptions.size <= 1) { return result; }

  availableOptions = availableOptions.unshift(new Map({id: -1, name: 'None'}));
  return result.set('availableOptions', availableOptions);
}

export function getAttributeOptionById(attributeName, optionId) {
  const attribute = getAttribute(attributeName);
  if (!attribute || !attribute.get('availableOptions')) {
    return null;
  }

  return attribute.get('availableOptions').find(item => String(item.get('id')) === String(optionId));
}
