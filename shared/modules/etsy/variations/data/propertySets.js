import _ from 'lodash';
import PROPERTY_SETS from './PROPERTY_SETS.json';
import QUALIFIERS from './QUALIFIERS.json';

const RECIPIENT_QUALIFIER_ID = 266817057;

const scaleQualifierForProperty = (propertyId) => {
  const qualifierId = _.get(PROPERTY_SETS.base[propertyId], 'property_id');
  return QUALIFIERS[qualifierId] || null;
};

export const deAliasTaxonomyId = (taxonomyId) => PROPERTY_SETS.aliases[taxonomyId] || taxonomyId;

export const deAliasRecipientId = (taxonomyId, recipientId) => {
  const propertySet = PROPERTY_SETS.propertySets[deAliasTaxonomyId(taxonomyId)];
  const aliases = _.get(propertySet, '100.aliases');
  return _.get(aliases, recipientId, recipientId);
};

export const getScaleQualifierId = (propertyId) => _.get(scaleQualifierForProperty(propertyId), 'property_id', null);

export const getScaleQualifierParamName = (propertyId) => _.get(scaleQualifierForProperty(propertyId), 'param', null);

export const getFirstTierQualifier = (taxonomyId, propertyId) => {
  if (!(taxonomyId && propertyId)) { return null; }
  const customPathToQualifier = `propertySets.${deAliasTaxonomyId((taxonomyId))}.${propertyId}`;
  const basePathToQualifier = `base.${propertyId}`;

  return _.get(PROPERTY_SETS, customPathToQualifier) ||
      _.get(PROPERTY_SETS, basePathToQualifier) ||
      null;
};

export const requiresRecipient = (taxonomyId, propertyId) => {
  const qualifier = getFirstTierQualifier(taxonomyId, propertyId);
  return qualifier ? qualifier.property_id === RECIPIENT_QUALIFIER_ID : false;
};

export const requiresScale = (taxonomyId, propertyId) => {
  return !!getFirstTierQualifier(taxonomyId, propertyId);
};

const getRecipientQualifierSet = (taxonomyId, propertyId) => {
  if (!(taxonomyId && propertyId)) {
    return null;
  }
  const recipientQualifier = getFirstTierQualifier(taxonomyId, propertyId);
  return _.get(recipientQualifier, 'property_id') === RECIPIENT_QUALIFIER_ID ? recipientQualifier : null;
};

export const getScaleQualifier = (taxonomyId, propertyId, recipientId = null) => {
  let result = getFirstTierQualifier(taxonomyId, propertyId);
  const resultIsRecipient = _.get(result, 'property_id') === RECIPIENT_QUALIFIER_ID;
  if (resultIsRecipient && recipientId) {
    const deAliasedRecipientId = deAliasRecipientId(taxonomyId, recipientId); // _.get(result, `aliases.${recipientId}`, recipientId);
    result = _.get(result, `results.${deAliasedRecipientId}`);
  }
  // is the result present a final node? If an invalid recipient ID was passed in, we might not have traversed far enough... so
  // check if there are still sub-results
  if (_.get(result, 'results') !== null) {
    return null;
  }
  return result;
};

const asNumber = (val) => parseInt(val, 10) || null;
export const resolveValidScale = (taxonomyId, propertyId, scaleId, recipientId = null) => {
  if (!(taxonomyId && propertyId && scaleId)) return null;
  const scaleQualiferSet = getScaleQualifier(asNumber(taxonomyId), asNumber(propertyId), asNumber(recipientId)) || {};
  return _.includes(scaleQualiferSet.options, asNumber(scaleId)) ? scaleId : null;
};

export const resolveValidRecipient = (taxonomyId, propertyId, recipientId) => {
  if (!(taxonomyId && propertyId && recipientId)) return null;
  const recipientQualifierSet = getRecipientQualifierSet(asNumber(taxonomyId), asNumber(propertyId), asNumber(recipientId)) || {};
  return _.includes(recipientQualifierSet.options, asNumber(recipientId)) ? recipientId : null;
};
