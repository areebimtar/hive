import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../pgSquel';

export class SyncShops {
  constructor(db) {
    this._db = db;
  }

  getByShopId(shopId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('sync_shop')
      .where('shop_id = ?::bigint', shopId)
      .toParam();

    return connection.any(text, values);
  }

  addProduct(shopId, productId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .insert()
      .into('sync_shop')
      .set('shop_id', shopId)
      .set('product_id', productId)
      .toParam();

    return connection.none(text, values);
  }

  async addProducts(shopId, productIds, db) {
    const chunks = _.chunk(productIds, 10);
    for (let i = 0; i < chunks.length; ++i) {
      await Promise.map(chunks[i], id => this.addProduct(shopId, id, db));
    }
  }

  deleteByShopId(shopId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .delete()
      .from('sync_shop')
      .where('shop_id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }
}
