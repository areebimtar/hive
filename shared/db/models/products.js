import PropertyValue from './propertyValue';

import * as add from './products/add';
import * as get from './products/get';
import * as search from './products/search';
import * as update from './products/update';
import * as del from './products/delete';

import { FIELDS } from '../../modules/etsy/constants';

export class Products {
  constructor(db) {
    this._propertyValueStore = new PropertyValue('products', { shop_id: 'bigint', modified_at: 'timestamp' });
    this._db = db;
  }

  // add operations
  insert(product, db = this._db) { return db.tx(t => add.insert(t, product)); }

  // get operations
  getById(productId, _db) { return get.getById(_db || this._db, productId); }
  getByIds(ids, _db) { return get.getByIds(_db || this._db, ids); }
  getStatusSummariesByShopId(shopId, options, _db) { return get.getStatusSummariesByShopId(_db || this._db, shopId, options); }
  getAll(ids, offset, limit, _db) { return get.getAll(_db || this._db, ids, offset, limit); }
  getStatesCounts(shopId, _db) { return get.getStatesCounts(_db || this._db, shopId); }

  // search operations
  getFilteredOnlyIds(shopId, offset, limit, filters, _db) { return search.getFilteredOnlyIds(_db || this._db, shopId, offset, limit, filters); }
  getFiltered(shopId, offset, limit, fields, filters, _db) { return search.getFiltered(_db || this._db, shopId, offset, limit, fields, filters); }
  getFilteredCount(shopId, filters, _db) { return search.getFilteredCount(_db || this._db, shopId, filters); }
  getFilteredFilters(shopId, filters, _db) { return search.getFilteredFilters(_db || this._db, shopId, filters); }

  // update operations
  update(product, _db) { return update.updateProduct(_db || this._db, product); }
  updateProducts(products, _db) { return update.updateProducts(_db || this._db, products); }
  deleteByIds(ids, _db) { return del.deleteByIds(_db || this._db, ids); }
  deleteByShopId(shopId, _db) { return del.deleteByShopId(_db || this._db, shopId); }
  setChannelModifiedToOldDate(productId, _db) { return update.updateProduct(_db || this._db, { id: productId, [FIELDS.HIVE_LAST_MODIFIED_TSZ]: '1970-01-01' }); }
  setState(productId, state, _db) { return update.updateProduct(_db || this._db, { id: productId, [FIELDS.STATE]: state }); }
}
