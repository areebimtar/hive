import _ from 'lodash';
import { FIELDS } from './constants';
import { check } from '../utils/check';
import * as convertors from './convertProduct';
import { AllHtmlEntities } from 'html-entities';

const entities = new AllHtmlEntities();

function collectSection(listing) {
  return listing[FIELDS.SHOP_SECTION_ID];
}

function collectPhotos(listing) {
  return _(listing.Images)
    .sortBy('rank')
    .map((image) => {
      return { channelImageId: image.listing_image_id, thumbnailUrl: image.url_75x75, fullsizeUrl: image.url_fullxfull };
    })
    .value();
}

function getAttributes(listing) {
  return _.get(listing, 'Attributes', []);
}

function createObjectKeysFilledWith(array, value) {
  return _.zipObject(array, _.fill(Array(array.length), value));
}

function addVariationsInfluencesTags(variations, listingInventory) {
  if (_.isArray(listingInventory)) {
    const listing = _.first(listingInventory);
    check(_.isObject(listing), 'Inventory listing is not object');
    check(_.isArray(listing.price_on_property), 'price_on_property is not array');
    check(_.isArray(listing.quantity_on_property), 'quantity_on_property is not array');
    check(_.isArray(listing.sku_on_property), 'sku_on_property is not array');
    const propertiesInfluencingPrice = createObjectKeysFilledWith(listing.price_on_property, true);
    const propertiesInfluencingQuantity = createObjectKeysFilledWith(listing.quantity_on_property, true);
    const propertiesInfluencingSku = createObjectKeysFilledWith(listing.sku_on_property, true);
    return _.map(variations, variation => {
      return {
        ...variation,
        influencesPrice: !!propertiesInfluencingPrice[variation.propertyId],
        influencesQuantity: !!propertiesInfluencingQuantity[variation.propertyId],
        influencesSku: !!propertiesInfluencingSku[variation.propertyId]
      };
    });
  } else {
    return variations;
  }
}

function fixPropertyIdOrder(etsyListingProducts) {
  const propertyIds = _.pluck(_.get(etsyListingProducts, '[0].property_values', []), 'property_id');
  if (!propertyIds.length) { return etsyListingProducts; }
  if (propertyIds.length > 2) { throw new Error(`Too many properties on etsy listing: ${propertyIds.length}`); }

  if (propertyIds.length === 2 && propertyIds[0] === 514 && propertyIds[1] === 513) {
    // wrong order, swap them
    propertyIds.push(propertyIds.shift());
  }
  return _.map(etsyListingProducts, product => {
    const productPropertyIds = _.pluck(product.property_values, 'property_id');
    const newPropertyValues = product.property_values;
    if (!_.isEqual(productPropertyIds, propertyIds)) {
      // wrong order, swap them
      newPropertyValues.push(newPropertyValues.shift());
    }
    return _.set(product, 'property_values', newPropertyValues);
  });
}

export function getVariations(logger, listingInventory) {
  if (! listingInventory) {
    // for old shops no inventory is present
    return [];
  }
  check(_.isArray(listingInventory), 'Inventory is not array');
  check(listingInventory.length === 1, 'More than one product in inventory');
  let products = _.first(listingInventory).products;
  check(_.isArray(products), 'Inventory products is not array');
  products = fixPropertyIdOrder(products);
  const variationsObject = _.reduce(products, (variations, product) => {
    _.forEach(product.property_values, (propertyValue, index) => {
      check(_.isFinite(propertyValue.property_id), 'Invalid property_id');
      if (_.isUndefined(variations[propertyValue.property_id])) {
        // new variation
        variations[propertyValue.property_id] = {
          propertyId: propertyValue.property_id,
          formattedName: entities.decode(propertyValue.property_name),
          scalingOptionId: propertyValue.scale_id,
          first: index === 0,
          options: []
        };
      }
      // add variation option if it is not there already
      const valueId = _.first(propertyValue.value_ids);
      const value = entities.decode(_.first(propertyValue.values));
      // in case valueId is null use value to check presence
      const criteria = valueId ? { valueId } : { value };
      if (!_.find(variations[propertyValue.property_id].options, criteria)) {
        variations[propertyValue.property_id].options.push({ valueId, value });
      }
    });
    return variations;
  }, {});
  check(_.keys(variationsObject).length <= 2, 'Inventory having more than two property_values');
  const variations = _(variationsObject)
    .values()
    .sortBy(variation => !variation.first)
    .value();
  return addVariationsInfluencesTags(variations, listingInventory);
}

function getInventoryPrice(price) {
  check(_.isObject(price), 'Inventory price is not object');
  check(_.isFinite(price.amount), 'Price amount is not a number');
  check(_.isFinite(price.divisor), 'Price divisor is not a number');
  check(price.divisor, 'Inventory divisor invalid');
  const priceNum = price.amount / price.divisor;
  check(_.isFinite(priceNum), 'Inventory price is invalid');
  return priceNum;
}

function getInventoryValueIds(propertyValues) {
  check(_.isArray(propertyValues), 'Inventory products property_values is not array');
  return _.map(propertyValues, (propertyValue) => {
    check(_.isArray(propertyValue.value_ids), 'Inventory products property_values value_ids is not array');
    check(propertyValue.value_ids.length === 1, 'Inventory products property_values more than one value_ids');
    return _.first(propertyValue.value_ids);
  });
}

function getInventoryValues(propertyValues) {
  check(_.isArray(propertyValues), 'Inventory products property_values is not array');
  return _.map(propertyValues, (propertyValue) => {
    check(_.isArray(propertyValue.values), 'Inventory products property_values values is not array');
    check(propertyValue.values.length === 1, 'Inventory products property_values more than one values');
    return _.first(propertyValue.values);
  });
}

function getProductOfferings(logger, listing) {
  const listingInventory = listing.Inventory;
  if (listingInventory) {
    check(_.isArray(listingInventory), 'Inventory is not array');
    check(listingInventory.length === 1, 'More than one product in inventory');
    let products = _.first(listingInventory).products;
    check(_.isArray(products), 'Inventory products is not array');
    products = fixPropertyIdOrder(products);
    return _.map(products, product => {
      // offerings
      check(_.isArray(product.offerings), 'Inventory products offerings is not array');
      check(product.offerings.length === 1, 'More than one offering for product');
      const offering = _.first(product.offerings);
      check(_.isObject(offering), 'No offering received');
      return {
        sku: product.sku,
        price: getInventoryPrice(offering.price),
        quantity: offering.quantity,
        visibility: offering.is_enabled !== 0,
        valueIds: getInventoryValueIds(product.property_values),
        values: getInventoryValues(product.property_values)
      };
    });
  } else {
    return listingInventory;
  }
}

function validateProduct(product) {
  const validStates = ['active', 'inactive', 'draft', 'expired'];
  if (validStates.indexOf(product[FIELDS.STATE]) === -1) { return `Unsupported listing state: ${product[FIELDS.STATE]}`; }
  if (!product.title) { return 'Title cannot be empty'; }
  return null;
}

export function convertListingToProduct(logger, listing) {
  const product = convertors.convertListingToProduct(listing, logger);
  product.variations = getVariations(logger, listing.Inventory);
  product.productOfferings = getProductOfferings(logger, listing);
  product.photos = collectPhotos(listing);
  product.section = collectSection(listing);
  product.attributes = getAttributes(listing);

  const error = validateProduct(product);
  if (error) {
    product[FIELDS.IS_INVALID] = !!error;
    product[FIELDS.INVALID_REASON] = error;
  }

  return product;
}
