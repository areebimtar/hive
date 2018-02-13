import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../../pgSquel';

import { checkType } from '../../../modules/utils/check';
import { VariationOptions } from './variationOptions';
import { variationHasOptionBasedPricing } from  '../../../modules/etsy/variations/pricing';

export class ProductVariations {
  constructor(db) {
    this._db = db;
    this.variationOptions = new VariationOptions(db);
  }

  async addVariations(productId, variations, connection = this._db) {
    checkType(_.isArray(variations), 'Bad input value: %s', variations);
    checkType(variations.length <= 2, 'Bad input value: too many (%s) items', variations.length);
    const insertedVariations = await Promise.map(variations, variation => this._addVariationWithOptions(productId, variation, connection));
    return insertedVariations;
  }

  async _addVariationWithOptions(productId, variation, connection) {
    if (variation.options && variation.options.length === 0) {
      return undefined;
    }
    const id = await this.addSingleVariation(productId, variation, connection);
    const addOptionsResult = await this.variationOptions.addOptions(id, !variation.first, variation.options, connection);
    if (variation.id) {
      // creating variations out of info from Etsy
      return {
        productId: productId,
        variationIdMap: {[variation.id]: id},
        optionsIdMap: _.reduce(variation.options, (optionIdObject, option, index) => _.merge(optionIdObject, {[variation.id]: {[option.id]: addOptionsResult.ids[index]}}), {})
      };
    } else  {
      // creating variations out of info from our UI
      return {
        valueIdToOptionIdMap: addOptionsResult.valueIdToOptionIdMap
      };
    }
  }

  // Add variation to given product
  // productId - link to product to which this variation belongs
  // variation - { productId, first, propertyId, formattedName }
  // @returns id of newly created object
  async addSingleVariation(productId, variation, connection = this._db) {
    checkType(_.isObject(variation), 'Bad variation object: %s', variation);
    const { first, propertyId, formattedName = '', scalingOptionId, recipientId, influencesPrice, influencesQuantity, influencesSku } = variation;

    checkType(_.isString(productId) || _.isNumber(productId), 'Bad product ID: %s', productId);
    checkType( _.isBoolean(first), 'Bad first property: %s (%s)', first, typeof first);
    checkType(_.isString(propertyId) || _.isNumber(propertyId), 'Bad property ID: %s', propertyId);
    checkType(_.isString(formattedName) || _.isNull(formattedName), 'Bad formatted value: %s', formattedName);
    checkType(!scalingOptionId || _.isString(scalingOptionId) || _.isFinite(scalingOptionId), 'Bad scalingOptionId value: %s', scalingOptionId);
    checkType(!recipientId || _.isFinite(recipientId), 'Bad recipientId value: %s', recipientId);

    // influencesPrice is undefined only if we haven't received inventory
    // decision is based on option based pricing then
    let influencesPriceOrOptionBasePricing;
    if (_.isUndefined(influencesPrice)) {
      influencesPriceOrOptionBasePricing = variationHasOptionBasedPricing(variation);
    } else {
      influencesPriceOrOptionBasePricing = !!influencesPrice;
    }
    const fields = {
      product_id: productId,
      property_id: propertyId,
      first: !!first,
      formatted_name: formattedName,
      scaling_option_id: scalingOptionId,
      recipient_id: recipientId,
      influences_price: influencesPriceOrOptionBasePricing,
      influences_quantity: !!influencesQuantity,
      influences_sku: !!influencesSku
    };
    const {text, values} = pgSquel
      .insert()
      .into('variations')
      .setFields(fields)
      .returning('id').toParam();

    return connection.one(text, values).get('id');
  }

  async getByProductId(productId, connection = this._db) {
    checkType(_.isString(productId) || _.isNumber(productId), 'Bad input value: %s', productId);

    const { text, values } = pgSquel
      .select().from('variations')
      .where('product_id=?::bigint', productId)
      .toParam();

    return connection.any(text, values);
  }

  async getByProductIdsWithOptions(productIds, connection = this._db) {
    let query = pgSquel
      .select()
      .field('variations.id', 'variation_id')
      .field('variations.product_id', 'variation_product_id')
      .field('variations.first', 'variation_first')
      .field('variations.property_id', 'variation_property_id')
      .field('variations.formatted_name', 'variation_formatted_name')
      .field('variations.scaling_option_id', 'variation_scaling_option_id')
      .field('variations.influences_price', 'variation_influences_price')
      .field('variations.influences_quantity', 'variation_influences_quantity')
      .field('variations.influences_sku', 'variation_influences_sku')
      .field('variation_options.id', 'option_id')
      .field('variation_options.value_id', 'option_value_id')
      .field('variation_options.value', 'option_value')
      .field('variation_options.formatted_value', 'option_formatted_value')
      .field('variation_options.price', 'option_price')
      .field('variation_options.is_available', 'option_is_available')
      .from('variations')
      .join('variation_options', null, 'variations.id = variation_options.variation_id')
      .order('variation_options.sequence')
      .order('variation_options.id');

    if (Array.isArray(productIds)) {
      if (productIds.length === 1) {
        query = query.where('variations.product_id = ?::bigint', productIds[0]);
      } else {
        query = query.where('variations.product_id in ?', productIds);
      }
    } else {
      query = query.where('variations.product_id = ?::bigint', productIds);
    }

    const { text, values } = query.toParam();

    const pickByPrefix = (obj, prefix) => {
      const newObj = {};
      Object.keys(obj).forEach(key => {
        if (key.startsWith(prefix)) {
          newObj[key.replace(prefix, '').replace(/_([a-z])/g, g => g[1].toUpperCase() )] = obj[key];
        }
      });
      return newObj;
    };

    return connection.any(text, values).then(allVariationOptions => {
      const variationOptionsByProductId = _.groupBy(allVariationOptions, 'variation_product_id');
      return _.mapValues(variationOptionsByProductId, (variationOptionsForProduct) => {
        const variations = _.groupBy(variationOptionsForProduct, 'variation_id');
        return _.mapValues(variations, variationOptionsForVariation => {
          const variation = pickByPrefix(variationOptionsForVariation[0], 'variation_');
          variation.options = variationOptionsForVariation.map(option => pickByPrefix(option, 'option_'));
          VariationOptions.removeExtraneousPrices(variation.options, !variation.first);
          return variation;
        });
      });
    });
  }

  async getWithOptionsByProductId(productId, connection = this._db) {
    const variations = await this.getByProductId(productId, connection);
    const options = await Promise.all(variations.map(v => this.variationOptions.getByVariationId(v.id, connection)));

    for (let i = 0; i < variations.length; i++) {
      variations[i].options = options[i];
      VariationOptions.removeExtraneousPrices(variations[i].options, !variations[i].first);
    }

    return variations;
  }

  async deleteByProductId(productId, connection = this._db) {
    checkType(_.isString(productId) || _.isNumber(productId), 'Bad input value: %s', productId);

    const { text, values } = pgSquel
      .delete()
      .from('variations')
      .where('product_id=?::bigint', productId)
      .toParam();

    return connection.none(text, values);
  }
}
