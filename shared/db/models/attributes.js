import Promise from 'bluebird';
import _ from 'lodash';
import * as utils from '../utils';
import pgSquel from '../../pgSquel';

const ATTRIBUTES_CHUNK_SIZE = 10;

export class Attributes {
  constructor(db) {
    this._db = db;
  }

  upsertAttribute(productId, attribute, db) {
    const connection = db || this._db;

    const columnNames = ['id', 'productId', 'propertyId', 'scaleId', 'valueIds', 'modified', 'deleted'];
    const validAttributes = _.pick(attribute, columnNames);
    let fields = _.set(validAttributes, 'productId', parseInt(productId, 10));
    if (!_.isBoolean(fields.modified)) {
      fields = _.set(validAttributes, 'modified', true);
    }
    if (!_.isBoolean(fields.deleted)) {
      fields = _.set(validAttributes, 'deleted', false);
    }
    fields = utils.snakelizeKeys(fields);
    fields = utils.replaceWithPostgressArrays(fields);

    const {text, values} = pgSquel.insert()
      .into('attributes')
      .setFields(fields)
      .onConflict('id', fields)
      .returning('id')
      .toParam();

    return connection.one(text, values).get('id').then((id) => { return parseInt(id, 10); });
  }

  async upsertAttributes(productId, attributes, db) {
    const connection = db || this._db;
    let insertedIds = [];

    // add all attributes in transaction
    await connection.tx(async (transaction) => {
      const chunks = _.chunk(attributes, ATTRIBUTES_CHUNK_SIZE);
      for (let i = 0; i < chunks.length; ++i) {
        const ids = await Promise.map(chunks[i], attribute => this.upsertAttribute(productId, attribute, transaction));
        insertedIds = insertedIds.concat(ids);
      }
    });
    return insertedIds;
  }

  getById(attributeId, db) {
    const connection = db || this._db;
    if (!_.isNumber(attributeId)) { return Promise.reject(new TypeError(`Bad attribute id: ${attributeId}`)); }

    const { text, values } = pgSquel
      .select()
      .from('attributes')
      .where('id=?::bigint', attributeId)
      .toParam();

    return connection.one(text, values);
  }

  getByIds(attributeIds, db) {
    const connection = db || this._db;
    // if there are no ids, then return empty array
    if (!attributeIds.length) { return Promise.resolve([]); }
    const { text, values } = pgSquel
      .select()
      .from('attributes')
      .where('id IN ?', attributeIds)
      .toParam();
    // make SQL query
    return connection.any(text, values);
  }

  getByProductId(productId, includeDeleted = false, db) {
    const connection = db || this._db;
    if (!productId || !(_.isString(productId) || _.isNumber(productId))) { return Promise.reject(new TypeError(`Bad product id: ${productId}`)); }

    let expr = pgSquel.expr().and('product_id=?::bigint', productId);
    if (!includeDeleted) {
      expr = expr.and('deleted=?::boolean', false);
    }

    const { text, values } = pgSquel
      .select()
      .from('attributes')
      .where(expr)
      .toParam();

    return connection.any(text, values);
  }

  getByProductIds(productIds, includeDeleted = false, db) {
    const connection = db || this._db;
    if (!productIds || !_.isArray(productIds)) { return Promise.reject(new TypeError(`Bad product ids array: ${productIds}`)); }
    if (!productIds.length) { return Promise.resolve([]); }

    let expr = pgSquel.expr().and('product_id IN ?', productIds);
    if (!includeDeleted) {
      expr = expr.and('deleted=?::boolean', false);
    }

    const { text, values } = pgSquel
      .select()
      .from('attributes')
      .where(expr)
      .toParam();

    return connection.any(text, values);
  }

  deleteById(attributeId, keepRecord = true, db) {
    const connection = db || this._db;
    let query;

    if (!_.isNumber(attributeId)) { return Promise.reject(new TypeError(`Bad attribute id: ${attributeId}`)); }
    if (keepRecord) {
      query = pgSquel
        .update()
        .table('attributes')
        .set('modified=?::boolean', false)
        .set('deleted=?::boolean', true)
        .where('id=?::bigint', attributeId)
        .toParam();
    } else {
      query = pgSquel
        .delete()
        .from('attributes')
        .where('id=?::bigint', attributeId)
        .toParam();
    }
    // make SQL query
    return connection.none(query.text, query.values);
  }

  deleteByIds(attributeIds, keepRecord = true, db) {
    const connection = db || this._db;
    let query;

    // if there are no ids, then do nothing
    if (!attributeIds.length) { return Promise.reject(new TypeError(`Bad attributes ids: ${attributeIds}`)); }


    if (keepRecord) {
      query = pgSquel
        .update()
        .table('attributes')
        .set('modified=?::boolean', false)
        .set('deleted=?::boolean', true)
        .where('id IN ?', attributeIds)
        .toParam();
    } else {
      query = pgSquel
        .delete()
        .from('attributes')
        .where('id IN ?', attributeIds)
        .toParam();
    }

    // make SQL query
    return connection.none(query.text, query.values);
  }
}
