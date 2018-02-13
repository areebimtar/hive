import _ from 'lodash';

export function compareIds(leftId, rightId) {
  return String(leftId) === String(rightId);
}

export const getPropValue = (data, prop, defaultValue = {}) => {
  const path = _.isArray(prop) ? prop : [prop];

  if (data && data.has && data.hasIn(path)) {
    const value = data.getIn(path);
    return (value && value.toJS) ? value.toJS() : value;
  }
  return defaultValue;
};

export const now = () => {
  const time = process.hrtime();
  return (time[0] * 1e9 + time[1]) / 1e6;
};

export const findAttributeIndex = (attributes, attributeId) => {
  return attributes.findIndex(attribute => attribute.get('propertyId', '') == attributeId); // eslint-disable-line
};

export const getAttributeValue = (attributes, attributeId, valueIndex = 0) => {
  const index = findAttributeIndex(attributes, attributeId);
  if (index === -1) { return null; }

  return attributes.getIn([index, 'valueIds', valueIndex], null);
};
