import * as get from './shopifyProducts/get';
import * as update from './shopifyProducts/update';
import * as del from './shopifyProducts/delete';
import * as search from './shopifyProducts/search';

export class ShopifyProducts {
  constructor(db) {
    this._db = db;
  }

  // get operations
  getById(productId, fields, _db) { return get.getById(_db || this._db, productId, fields); }
  getByIds(ids, _db) { return get.getByIds(_db || this._db, ids); }
  getByShopId(shopId, fields, _db) { return get.getByShopId(_db || this._db, shopId, fields); }
  getStatusSummariesByShopifyProductIds(shopifyProductsIds, _db) { return get.getStatusSummariesByShopifyProductIds(_db || this._db, shopifyProductsIds); }
  getAll(ids, offset, limit, _db) { return get.getAll(_db || this._db, ids, offset, limit); }
  getStatesCounts(shopId, _db) { return get.getStatesCounts(_db || this._db, shopId); }

  // // search operations
  getFiltered(shopId, offset, limit, fields, filters, _db) { return search.getFiltered(_db || this._db, shopId, offset, limit, fields, filters); }
  getFilteredCount(shopId, filters, _db) { return search.getFilteredCount(_db || this._db, shopId, filters); }
  getFilteredFilters(shopId, filters, _db) { return search.getFilteredFilters(_db || this._db, shopId, filters); }

  // update and delete
  update(product, db = this._db) { return db.tx(t => update.update(t, product)); }
  upsert(product, db = this._db) { return db.tx(t => update.upsert(t, product)); }
  upsertProducts(products, db = this._db) { return db.tx(t => update.upsertProducts(t, products)); }
  deleteByIds(ids, _db) { return del.deleteByIds(_db || this._db, ids); }
  // deleteByShopId(shopId, _db) { return del.deleteByShopId(_db || this._db, shopId); }

  getProductTypes(shopId, _db) { return get.getProductTypes(_db || this._db, shopId); }
  getVendors(shopId, _db) { return get.getVendors(_db || this._db, shopId); }
}
