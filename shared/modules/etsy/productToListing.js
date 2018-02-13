
import _ from 'lodash';
import * as converters from './convertProduct';
import { ETSY_PRODUCT, FIELDS } from './constants';
import { checkType } from '../utils/check';
import { getRecipientIdFromEnum } from './variations/data/qualifierOptions';
import { getScaleQualifierParamName } from './variations/data/propertySets';

export function resultsInEmptyListing(modifiedFields) {
  const listingFieldNames = _.pluck(ETSY_PRODUCT, 'name');
  return _.isEmpty(_.intersection(listingFieldNames, modifiedFields));
}

export function convertProductToListing(product, modifiedFields) {
  if (modifiedFields.indexOf(FIELDS.SECTION_ID) !== -1) {
    modifiedFields.push(FIELDS.SHOP_SECTION_ID);
  }
  const fullListing = converters.convertProductToListing(product);
  const fields = _.filter(ETSY_PRODUCT, field =>
    (field.required || (modifiedFields.indexOf(field.name) !== -1)) && !field.internal);

  const listing = _.reduce(fields, (result, field) => {
    if (field.required && !fullListing[field.name]) {
      throw new Error(`${field.name} is required but missing.`);
    }
    return _.set(result, field.name, fullListing[field.name]);
  }, {});

  return listing;
}

const CUSTOM_PROPERTY_1 = '513';
const CUSTOM_PROPERTY_2 = '514';

const convertProductOptionsToListingOptions = (productOptions, variationPropertyId, productLevelPrice) => {
  // order the options by their sequence number, Etsy doesn't use a number, just the
  // order of the array
  const orderedOptions = _.sortBy(productOptions, 'sequence');

  return _.map(orderedOptions, ({value, is_available, price}) => {
    // When modifying variations and product-level prices together, there are some situations where etsy will not allow the price
    // to be sent at the product level. So, we always send a price with every variation, even if it's just the product-level
    // one over and over.
    const priceToSend = price || productLevelPrice;
    const optionValue = {
      property_id: variationPropertyId,
      value: value,
      is_available,
      price: priceToSend
    };
    return optionValue;
  });
};

export function convertProductVariationsToListingVariations({recipient, price }, variations) {
  checkType(_.isArray(variations) && variations.length <= 2, 'Bad input value: %s', variations);

  const result = { variations: [] };
  const customPropMapping = {};

  // put the variations into an array so the first one comes first to please the rain gods of etsy
  const orderedVariations = variations.length < 2 ? variations : [_.find( variations, {first: true}), _.find( variations, {first: false})];

  for (const {formatted_name: formattedName, scaling_option_id: scaleId, property_id: propertyId, options} of orderedVariations) {
    if (scaleId) {
      const scalingParamName = getScaleQualifierParamName(propertyId);
      if (!scalingParamName) {
        throw new Error(`Cannot find scaling information for property id: ${propertyId}`);
      }

      result[scalingParamName] = scaleId;
    }

    if (propertyId === CUSTOM_PROPERTY_1 || propertyId === CUSTOM_PROPERTY_2) {
      customPropMapping[propertyId] = formattedName;
    }

    const listingOptions = convertProductOptionsToListingOptions(options, propertyId, price);

    result.variations = result.variations.concat(listingOptions);
  }

  if (recipient) {
    const recipientId = getRecipientIdFromEnum(recipient);
    if (recipientId) {
      result.recipient_id = recipientId;
    }
  }

  if (!_.isEmpty(customPropMapping)) {
    result.custom_property_names = customPropMapping;
  }
  return result;
}

function getPropertyIdListByBoolKey(productOfferings, boolKey) {
  const propertyIds = _(productOfferings)
    .flatten()
    .filter(product => product[boolKey])
    .pluck('propertyId')
    .map(propertyId => parseInt(propertyId, 10))
    .unique()
    .value();
  return propertyIds;
}

export function convertProductOfferingsToListingInventory(listingId, productOfferings) {
  const etsyProducts = _.map(productOfferings, products => {
    // we have the actual offering the same for all products
    // as a result of a left join
    const offering = _.first(products);
    const price = parseFloat(offering.price);
    // this may be a listing with no variations and just the default productOffering
    const productsWithProperties = _.filter(products, p => !!p.propertyId );
    return {
      sku: offering.sku || '',
      property_values: _.map(productsWithProperties, product => {
        return {
          property_id: parseInt(product.propertyId, 10),
          property_name: product.formattedName,
          scale_id: parseInt(product.scalingOptionId, 10) || null,
          value_id: parseInt(product.valueId, 10),
          value: product.value
        };
      }),
      offerings: [{
        price: _.isFinite(price) ? price : 0,
        quantity: offering.quantity || 0,
        is_enabled: offering.visibility ? 1 : 0
      }]
    };
  });

  return {
    listing_id: parseInt(listingId, 10),
    products: JSON.stringify(etsyProducts),
    price_on_property: getPropertyIdListByBoolKey(productOfferings, 'influencesPrice'),
    quantity_on_property: getPropertyIdListByBoolKey(productOfferings, 'influencesQuantity'),
    sku_on_property: getPropertyIdListByBoolKey(productOfferings, 'influencesSku')
  };
}
