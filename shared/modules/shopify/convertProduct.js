import _ from 'lodash';
import { dbTypeConverter, listingTypeConverter } from './typeConverters';
import { SHOPIFY_PRODUCT } from './constants';

const SHOPIFY_PRODUCT_TO_DB = _.reduce(SHOPIFY_PRODUCT, (result, field) => _.set(result, field.name, field), {});

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
  return _.reduce(SHOPIFY_PRODUCT, (result, field) => {
    if (field.internal) { return result; }

    const fieldNameTo = convertFn === 'toProduct' ? field.name : field.shopifyName || field.name;
    const fieldNameFrom = convertFn === 'toProduct' ? field.shopifyName || field.name : field.name;

    const convertor = listingTypeConverter[field.type];
    let value = null;
    if (convertor && convertor[convertFn]) {
      value = convertor[convertFn](data[fieldNameFrom], field.typeData);
    }
    const allowNull = _.get(field, ['typeData', 'allowNull'], false);
    if (field.required && !value && !allowNull) {
      throw new TypeError(`${fieldNameFrom} is required but not present in listing data`);
    }

    if (value || (_.isNull(value) && allowNull)) {
      return _.set(result, fieldNameTo, value);
    }

    return result;
  }, {});
}

export function convertProductToDBData(product) {
  return convertDB(product, SHOPIFY_PRODUCT_TO_DB, 'toDB');
}

export function convertDBDataToProduct(dbData) {
  return convertDB(dbData, SHOPIFY_PRODUCT_TO_DB, 'toProduct');
}

export function convertProductToListing(product, modifiedFields) {
  const listing = convertListing(product, 'toListing');

  return _.reduce(SHOPIFY_PRODUCT, (result, field) => {
    const key = field.shopifyName || field.name;
    if (field.internal) { return result; }
    if (_.isUndefined(listing[key])) { return result; }
    if (field.required) { return _.set(result, key, listing[key]); }
    if (!_.isEmpty(modifiedFields) && (modifiedFields.indexOf(field.shopifyName) === -1) && (modifiedFields.indexOf(field.name) === -1)) { return result; }
    return _.set(result, key, listing[key]);
  }, {});
}

export function convertListingToProduct(listing) {
  return convertListing(listing, 'toProduct');
}
