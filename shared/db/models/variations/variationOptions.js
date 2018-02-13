import _ from 'lodash';
import pgSquel from '../../../pgSquel';

import {checkType} from '../../../modules/utils/check';

function computeFieldRows(variationId, options) {
  let sequence = 0;
  return _.map(options, opt => {
    sequence++;
    const fields = {
      value: opt.value,
      is_available: _.isBoolean(opt.isAvailable) ? opt.isAvailable : null,
      sequence: sequence,
      value_id: opt.valueId || null,
      variation_id: variationId >= 0 ? variationId : null,
      price: opt.price || null,
      formatted_value: opt.formattedValue || null
    };
    return fields;
  });
}

export class VariationOptions {
  constructor(db) {
    this._db = db;
  }

  static _uniquePriceCount(options = []) {
    const prices = _.mapValues(options, (option) => {
      return option.price ? parseFloat(option.price) : null;
    });
    const populatedPrices = _.filter(prices, (price) => !!price);
    return _.unique(populatedPrices).length;
  }

  static removeExtraneousPrices(options, force) {
    const shouldRemove = force || this._uniquePriceCount(options) < 2;
    if (shouldRemove) {
      _.forEach(options, (option) => {
        if (_.has(option, 'price')) { delete option.price; }
      });
    }
  }

  static createValueIdToOptionIdMap(rows) {
    return _.reduce(rows, (valueIdToIdMap, row) => {
      valueIdToIdMap[row.value_id || row.value] = row.id;
      return valueIdToIdMap;
    }, {});
  }

  async addOptions(variationId, forcePriceStripping, options, connection = this._db) {
    checkType(_.isString(variationId) || _.isNumber(variationId), 'Bad variation ID: %s', variationId);
    checkType(_.isArray(options), 'Bad input value: %s is not an array', options);

    for (const opt of options) {
      checkType(_.isObject(opt), 'Bad options value object: %s', opt);
      checkType(_.isUndefined(opt.valueId) || _.isNull(opt.valueId) || _.isNumber(opt.valueId) || _.isString(opt.valueId), 'Bad value ID on option: %s', opt);
      checkType(_.isString(opt.value), 'Bad value on option: %s', opt);
      checkType(_.isUndefined(opt.formattedValue) || _.isNull(opt.formattedValue) || _.isString(opt.formattedValue), 'Bad formattedValue on option: %s', opt);
      checkType(_.isUndefined(opt.price) || _.isNull(opt.price) || _.isNumber(opt.price) || _.isString(opt.price), 'Bad price on option: %s', opt);
    }

    VariationOptions.removeExtraneousPrices(options, forcePriceStripping);

    const fieldRows = computeFieldRows(variationId, options);
    const { text, values } = pgSquel
      .insert()
      .into('variation_options')
      .setFieldsRows(fieldRows)
      .returning('id, value_id, value')
      .toParam();
    return connection.any(text, values)
      .then((rows) => {
        return {
          ids: _.pluck(rows, 'id'),
          valueIdToOptionIdMap: VariationOptions.createValueIdToOptionIdMap(rows)
        };
      });
  }

  async getByVariationId(variationId, connection = this._db) {
    checkType(_.isString(variationId) || _.isNumber(variationId), 'Bad input value: %s', variationId);

    const { text, values } = pgSquel
      .select().from('variation_options')
      .where('variation_id=?::bigint', variationId)
      .toParam();

    return connection.many(text, values);
  }

  async deleteByVariationId(variationId, connection = this._db) {
    checkType(_.isString(variationId) || _.isNumber(variationId), 'Bad input value: %s', variationId);

    const { text, values } = pgSquel
      .delete()
      .from('variation_options')
      .where('variation_id=?::bigint', variationId)
      .toParam();

    return connection.none(text, values);
  }
}
