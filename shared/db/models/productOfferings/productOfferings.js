import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../../pgSquel';
import { ProductVariations } from '../variations/productVariations';
import { checkType, check } from '../../../modules/utils/check';
import { camelizeKeys } from '../../utils';

const OFFERINGS_CHUNK_SIZE = 10;

async function insertProductOffering(fields, connection) {
  const {text, values} = pgSquel
    .insert()
    .into('product_offerings')
    .setFields(fields)
    .returning('id').toParam();

  return connection.one(text, values).get('id');
}

async function insertOptions(productOfferingId, variationOptionIds, connection) {
  const sql = pgSquel
    .insert()
    .into('product_offering_options')
    .setFieldsRows(_.map(variationOptionIds, (variationOptionId) => {
      return {
        product_offering_id: productOfferingId,
        variation_option_id: variationOptionId
      };
    }));

  return connection.any(sql.toString(), []);
}

function addSingle(productId, productOffering, connection) {
  const fields = {
    product_id: productId,
    sku: productOffering.sku,
    price: parseFloat(productOffering.price),
    quantity: productOffering.quantity,
    visibility: productOffering.visibility
  };
  return insertProductOffering(fields, connection)
    .then(id => {
      if (_.isEmpty(productOffering.optionIds)) {
        return Promise.resolve();
      } else {
        return insertOptions(id, productOffering.optionIds, connection);
      }
    });
}

async function addByChunks(productId, productOfferings, connection) {
  checkType(_.isString(productId) || _.isFinite(productId), 'bad productId: %s', productId);
  check(_.isArray(productOfferings), 'productOfferings need to be an array');
  const addOffering = _.partial(addSingle, productId, _, connection);
  const chunks = _.chunk(productOfferings, OFFERINGS_CHUNK_SIZE);
  const addResults = [];
  for (let chunkNo = 0; chunkNo < chunks.length; ++chunkNo) {
    const addResult = await Promise.map(chunks[chunkNo], addOffering);
    addResults.push(addResult);
  }
  return _.flatten(addResults);
}

export class ProductOfferings {
  constructor(db) {
    this._db = db;
    this.variations = new ProductVariations(db);
  }

  addFromProductIdUsingInventory(productId, productOfferings, connection = this._db) {
    return addByChunks(productId, productOfferings, connection);
  }

  addProductOfferings(productId, webProductOfferings, connection = this._id) {
    return addByChunks(
      productId,
      _.map(webProductOfferings, offering =>
        _.set(offering, 'optionIds', _.pluck(offering.variationOptions, 'optionId'))),
      connection);
  }

  async deleteByProductId(productId, connection = this._db) {
    checkType(_.isString(productId) || _.isNumber(productId), 'Bad input value: %s', productId);

    const { text, values } = pgSquel
      .delete()
      .from('product_offerings')
      .where('product_id=?::bigint', productId)
      .toParam();

    return connection.none(text, values);
  }

  async getByProductIds(productIdsOrId, connection = this._db) {
    const query = pgSquel
      .select()
      .field('po.product_id')
      .field('po.id')
      .field('po.price')
      .field('po.sku')
      .field('po.quantity')
      .field('po.visibility')
      .field(`json_agg((SELECT x FROM (SELECT to_char(vo.id, 'FM9999999999999999999') AS option_id, to_char(vo.variation_id, 'FM9999999999999999999') as variation_id, vo.sequence, v.first) x))`, ' variation_options')
      .from('product_offerings po')
      .left_join('product_offering_options', 'poo', 'po.id = poo.product_offering_id')
      .left_join('variation_options', 'vo', 'vo.id = poo.variation_option_id')
      .left_join('variations', 'v', 'v.id = vo.variation_id')
      .group('po.id');

    const productIds = _.isArray(productIdsOrId) ? productIdsOrId : [ productIdsOrId ];

    // we are deliberately using one query per productId to save db the need
    // to use Sort Method: external merge on Disk (slow!)
    const productOfferingsRowGroups = await Promise.map(productIds, productId => {
      const productQuery = query.clone().where('po.product_id = ?::bigint', productId);
      const { text, values } = productQuery.toParam();
      return connection.any(text, values);
    });

    const productOfferings = _.flatten(productOfferingsRowGroups);
    _.forEach(productOfferings, (po) => {
      // remove the null variation_options incurred by the left join
      _.remove(po.variation_options, (option) => !option.option_id);
      // camelcase the keys of the variation_options object
      po.variation_options = _.map(po.variation_options, camelizeKeys);
    });

    // camelcase the top level keys each product offering and transform the array to
    // a map of arrays by productID
    const groupedByProductId = _.groupBy(_.map(productOfferings, camelizeKeys), 'productId');

    _.forEach(groupedByProductId, offeringsArray => {
      // sort each pair of variation options so first comes first
      _.forEach(offeringsArray, offering => {
        _.get(offering, 'variationOptions', []).sort((option1, option2) => {
          return _.get(option2, 'first') ? 1 : -1;
        });
      });

      // now sort the list of offerings by sequence of the variation optiosn
      offeringsArray.sort((offering1, offering2) =>  {
        const off1option1 = _.get(offering1, 'variationOptions[0].sequence', 0);
        const off2option1 = _.get(offering2, 'variationOptions[0].sequence', 0);
        const off1option2 = _.get(offering1, 'variationOptions[1].sequence', 0);
        const off2option2 = _.get(offering2, 'variationOptions[1].sequence', 0);

        return off1option1 === off2option1 ? off1option2 - off2option2 : off1option1 - off2option1;
      });
    });

    return groupedByProductId;
  }

  async getByProductIdWithVariations(productId, connection = this._db) {
    const query = pgSquel
      .select()
      .field('po.id', 'id')
      .field('po.price')
      .field('po.sku')
      .field('po.quantity')
      .field('po.visibility')
      .field('value_id')
      .field('value')
      .field('formatted_name')
      .field('property_id')
      .field('scaling_option_id')
      .field('influences_price')
      .field('influences_quantity')
      .field('influences_sku')
      .field('vo.sequence')
      .field('first')
      .from('product_offerings', 'po')
      .left_join('product_offering_options', 'poo', 'po.id = poo.product_offering_id')
      .left_join('variation_options', 'vo', 'poo.variation_option_id = vo.id')
      .left_join('variations', 'v', 'vo.variation_id = v.id')
      .where('po.product_id = ?::bigint', productId);

    const { text, values } = query.toParam();
    const productOfferings = await connection.any(text, values);

    const groupedByOffering = _(productOfferings)
      .map(camelizeKeys)
      .groupBy('id')
      .values()
      .value();

    // now we have an array of arrays. Each element in the sub-array represents the variation options of
    // one offering. Now we make sure the first variation property is first in the sub-arrays
    _.forEach(groupedByOffering, (subArray) => {
      if (_.isArray(subArray)) {
        subArray.sort((property1, property2) => {
          return _.get(property2, 'first') ? 1 : -1;
        });
      }
    });

    // now are the offerings themselves in order? For each sub array, we want to consider the option sequence of
    groupedByOffering.sort((subArray1, subArray2) => {
      const prop1diff = _.get(subArray1, '[0].sequence', 0) - _.get(subArray2, '[0].sequence', 0);
      return prop1diff !== 0 ? prop1diff : _.get(subArray1, '[1].sequence', 0) - _.get(subArray2, '[1].sequence', 0);
    });

    return groupedByOffering;
  }
}
