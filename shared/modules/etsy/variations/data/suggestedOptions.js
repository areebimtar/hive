import _ from 'lodash';
import OPTIONS_DATA from './SUGGESTED_OPTIONS.json';

export const getSuggestedOptionIds = (propertyId, recipientId, scaleId) => {
  let lookupKey = propertyId;
  if (recipientId) {
    lookupKey += `.${recipientId}`;
  }
  if (scaleId) {
    lookupKey += `.${scaleId}`;
  }
  return OPTIONS_DATA.suggestedOptionLists[lookupKey] || [];
};

export const getSuggestedOptions = (propertyId, recipientId, scaleId) => {
  const ids = getSuggestedOptionIds(propertyId, recipientId, scaleId);
  return _.map(ids, (id) => OPTIONS_DATA.optionDetails[id]);
};
