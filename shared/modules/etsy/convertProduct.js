import _ from 'lodash';
import { dbTypeConverter, listingTypeConverter } from './typeConverters';
import { ETSY_PRODUCT } from './constants';

const ETSY_PRODUCT_TO_DB = _.reduce(ETSY_PRODUCT, (result, field) => _.set(result, field.name, field), {});

function convertDB(product, fields, convertFn) {
  return _.reduce(product, (result, value, name) => {
    const converterData = fields[name];
    if (!converterData || converterData.public) { return result; }

    const converter = dbTypeConverter[converterData.type];
    if (!converter) { return result; }

    if (!converter[convertFn]) { return result; }

    return _.set(result, converterData.name, converter[convertFn](value, converterData.typeData));
  }, {});
}

function convertListing(data, convertFn) {
  return _.reduce(ETSY_PRODUCT, (result, field) => {
    if (field.internal && !data[field.name]) { return result; }

    const convertor = listingTypeConverter[field.type];
    let value = null;
    if (convertor && convertor[convertFn]) {
      value = convertor[convertFn](data[field.name], field.typeData);
    }
    const allowNull = _.get(field, ['typeData', 'allowNull'], false);
    if (field.required && !value && !allowNull) {
      throw new TypeError(`${field.name} is required but not present in listing data`);
    }

    if (value || _.isBoolean(value) || (_.isNull(value) && allowNull)) {
      return _.set(result, field.name, value);
    }

    return result;
  }, {});
}

export function convertProductToDBData(product) {
  return convertDB(product, ETSY_PRODUCT_TO_DB, 'toDB');
}

export function convertDBDataToProduct(dbData) {
  return convertDB(dbData, ETSY_PRODUCT_TO_DB, 'toProduct');
}

export function convertProductToListing(product) {
  return convertListing(product, 'toListing');
}

export function convertListingToProduct(listing) {
  return convertListing(listing, 'toProduct');
}
