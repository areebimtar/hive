import _ from 'lodash';
import moment from 'moment';

const toInt = value => parseInt(value, 10);
const toString = value => value && String(value);
const toEscapedString = value => toString(value).replace(/"/g, '\\"');
const toISOString = date => date && moment(date).toISOString();
const toBool = value => !!value;
const toDBStringArray = values => `{${_.map(values, value => toEscapedString(value)).join(', ')}}`;
const toStringArray = values => _.map(values, toString);
const toDBIntegerArray = values => `{${_.map(values, value => toInt(value)).join(', ')}}`;
const toIntegerArray = values => _.map(values, toInt);
const identity = values => values;
const fromStringToStringArray = values => _.isString(values) && _.map(String(values).split(','), value => String(value).trim());
const fromStringArrayToString = values => values.join(', ');

export const dbTypeConverter = {
  bigint: { toDB: toString, toProduct: toString },
  integer: { toDB: toInt, toProduct: toInt },
  string: { toDB: toString, toProduct: toString },
  date: { toDB: toISOString, toProduct: toISOString },
  boolean: { toDB: toBool, toProduct: toBool },
  arrayOfStrings: { toDB: toDBStringArray, toProduct: toStringArray },
  arrayOfImages: { toDB: toDBIntegerArray, toProduct: toIntegerArray },
  productType: { toDB: toString, toProduct: toString },
  vendor: { toDB: toString, toProduct: toString }
};

export const listingTypeConverter = {
  bigint: { toProduct: toString, toListing: toInt },
  integer: { toProduct: toInt, toListing: toInt },
  string: { toProduct: toString, toListing: toString },
  date: { toProduct: toISOString, toListing: toISOString },
  arrayOfImages: { toProduct: identity, toListing: identity },
  arrayOfStrings: { toProduct: fromStringToStringArray, toListing: fromStringArrayToString },
  productType: { toProduct: toString, toListing: toString },
  vendor: { toProduct: toString, toListing: toString }
};
