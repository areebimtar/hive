import _ from 'lodash';
import moment from 'moment';
import { AllHtmlEntities } from 'html-entities';
import S from 'string';

const entities = new AllHtmlEntities();

const toSafeString = (value, typeData) => {
  if (_.isNull(value) && _.get(typeData, 'allowNull', false)) { return value; }

  const safeValue = String(value).replace(/\0/g, '');
  return S(safeValue).replaceAll('&apos;', '\'').s;
};
const toInt = value => _.isArray(value) ? _.map(value, val => parseInt(val, 10)) : parseInt(value, 10);
const toFloat = value => _.isArray(value) ? _.map(value, parseFloat) : parseFloat(value);
const toString = (value, typeData) => _.isArray(value) ? _.map(value, toSafeString) : toSafeString(value, typeData);
const toUnquotedString = value => toString(value).replace(/"/g, '');
const toDBDate = (tsz) => moment.unix(toInt(tsz)).toISOString();
const fromDBDate = (value) => {
  const timestamp = moment(value);
  if (timestamp.isValid()) {
    return timestamp.unix();
  }
  return null;
};
const toDbPrice = (value) => {
  const float = toFloat(value);
  if (!_.isFinite(float)) { return null; }
  return Math.floor(float * 100);
};
const fromDbPrice = (value) => {
  const int = toInt(value);
  if (!_.isFinite(int)) { return null; }
  return int / 100;
};
const toDBStringArray = values => `{${_.map(values, value => toSafeString(value)).join(', ')}}`;
const toDBIntegerArray = values => `{${_.map(values, value => toSafeString(value)).join(', ')}}`;
const toIntegerArray = values => _.map(values, toInt);
const toStringArray = values => _.map(values, toString);
const toUnquotedStringArray = values => _.map(values, toUnquotedString);
const toBoolean = value => !!value;
const toEnum = (value, typeData) => {
  if (typeData.values.indexOf(value) !== -1) { return value; }
  if (typeData.default) { return typeData.default; }
  throw new TypeError(`Bad enum value: ${value}. Valid values: ${JSON.stringify(typeData)}`);
};
const decodeString = value => entities.decode(value || '');

export const dbTypeConverter = {
  integer: { toDB: toInt, toProduct: toInt },
  string: { toDB: toString, toProduct: toString },
  encodedString: { toDB: toString, toProduct: toString },
  price: { toDB: toDbPrice, toProduct: fromDbPrice },
  arrayOfStrings: { toDB: toDBStringArray, toProduct: toStringArray },
  arrayOfIntegers: { toDB: toDBIntegerArray, toProduct: toIntegerArray },
  boolean: { toDB: toBoolean, toProduct: toBoolean },
  date: { toDB: toDBDate, toProduct: fromDBDate },
  enum: { toDB: toString, toProduct: toString }
};

export const listingTypeConverter = {
  integer: { toProduct: toInt, toListing: toInt },
  string: { toProduct: toString, toListing: toString },
  encodedString: { toProduct: decodeString, toListing: toString },
  price: { toProduct: toFloat, toListing: toFloat },
  arrayOfStrings: { toProduct: toUnquotedStringArray, toListing: toUnquotedStringArray },
  arrayOfIntegers: { toProduct: toIntegerArray, toListing: toIntegerArray },
  boolean: { toProduct: toBoolean, toListing: toBoolean },
  date: { toProduct: toInt, toListing: toInt },
  enum: { toProduct: toEnum, toListing: toEnum }
};
