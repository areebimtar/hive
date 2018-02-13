import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../pgSquel';
import * as utils from '../utils';

export class Images {
  constructor(db) {
    this._db = db;
  }

  getByShopId(shopId, db) {
    const connection = db || this._db;
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Shop id is not a number: ${shopId}`)); }

    const { text, values } = pgSquel
      .select()
      .from('images')
      .where('shop_id=?::bigint', shopId)
      .toParam();

    return connection.manyOrNone(text, values);
  }

  getByIds(ids) {
    // if there are no ids, then return empty array
    if (!ids.length) { return Promise.resolve([]); }

    let query = pgSquel
      .select()
      .from('images');
    // if we have only one id, we can't use id IN (...) but we need to use equality
    if (ids.length === 1) {
      query = query.where('id = ?::bigint', ids[0]);
    } else {
      query = query.where('id IN ?', ids);
    }

    const { text, values } = query.toParam();
    // make SQL query
    return this._db.any(text, values).then((rows) => {
      // normalize response
      return utils.build(rows);
    });
  }

  getByVelaImageId(shopId, velaImageId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('images')
      .where('shop_id = ?::bigint', shopId)
      .where('vela_image_id = ?::bigint', velaImageId)
      .forUpdate()
      .toParam();

    return connection.any(text, values);
  }

  findByEtsyImageId(shopId, etsyImageId) {
    const { text, values } = pgSquel
      .select()
      .from('images')
      .where('channel_image_id = ?::text', etsyImageId)
      .where('shop_id = ?::bigint', shopId)
      .toParam();

    return this._db.oneOrNone(text, values);
  }

  update(image) {
    const { text, values } = pgSquel
      .update()
      .table('images')
      .setFields(image)
      .where('id = ?::bigint', image.id)
      .toParam();

    return this._db.none(text, values);
  }

  deleteById(imageId, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .delete()
      .from('images')
      .where('id = ?::bigint', imageId)
      .toParam();

    return connection.none(text, values);
  }

  deleteByIds(ids, db) {
    const connection = db || this._db;
    if (!_.isArray(ids)) { return Promise.reject(new TypeError(`Bad ids: ${ids}`)); }

    const { text, values } = pgSquel
      .delete()
      .from('images')
      .where('id in ?', ids)
      .toParam();

    return connection.none(text, values);
  }

  _delete(condition, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .delete()
      .from('images')
      .where(condition)
      .toParam();

    return connection.none(text, values);
  }

  deleteByProductIds(productIds, db) {
    if (!_.isArray(productIds)) {
      return Promise.reject(new TypeError(`Product ids is not an array: ${productIds}`));
    }

    const queryCondition = (productIds.length === 1)
      ? pgSquel.expr().and('product_id = ?::bigint', productIds[0])
      : pgSquel.expr().and('product_id IN ?', productIds);

    return this._delete(queryCondition, db);
  }

  deleteByProductId(productId, db) {
    if (!_.isNumber(productId) && !_.isString(productId)) {
      return Promise.reject(new TypeError(`Product id is not a number: ${productId}`));
    }

    const queryCondition = pgSquel.expr().and('product_id = ?::bigint', productId);
    return this._delete(queryCondition, db);
  }

  upsert(image, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .insert()
      .into('images')
      .setFields(image)
      .onConflict('id', image)
      .returning('id')
      .toParam();

    return connection.one(text, values).get('id').then((id) => { return parseInt(id, 10); });
  }

  insert(image, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .insert()
      .into('images')
      .setFields(image)
      .returning('id')
      .toParam();

    return connection.one(text, values).get('id');
  }
}
