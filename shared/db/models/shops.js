import Promise from 'bluebird';
import _ from 'lodash';
import * as constants from './constants';
import * as utils from '../utils';
import pgSquel from '../../pgSquel';
import moment from 'moment';

export class Shops {
  constructor(db) {
    this._db = db;
  }

  addShops(accountId, shops, db) {
    const connection = db || this._db;
    const insertedIds = [];

    return connection.tx((t) => { // add all shops in transaction
      function source(index) {
        if (index >= shops.length) { return undefined; }
        return this.addShop(accountId, shops[index], t)
          .then((shopId) => {
            insertedIds.push(shopId);
          });
      }

      return t.sequence(source.bind(this));
    })
    .then(() => {
      return insertedIds;
    });
  }

  async addShop(accountId, properties, db) {
    const connection = db || this._db;

    properties.account_id = accountId;
    properties.sync_status = null;
    if (!properties.last_sync_timestamp) {
      properties.last_sync_timestamp = '1999-01-01';
    }
    properties.created_at = moment().toISOString();

    // first, we need to check if there isn't another shop with channel shop ID
    // if so, set flag "invalid" and store error message
    const shops = await this.getByChannelShopId(properties.channel_shop_id);
    if (shops && shops.length) {
      properties.invalid = true;
      properties.error = 'Sorry, that shop is being managed in Vela by another user';
      properties.sync_status = constants.SHOP_SYNC_STATUS_DUPLICATE;
    }

    const {text, values} = pgSquel.insert()
      .into('shops')
      .setFields(properties)
      .returning('id')
      .toParam();

    return connection.one(text, values).get('id').then((id) => {
      if (properties.sync_status === constants.SHOP_SYNC_STATUS_DUPLICATE) {
        return null;
      }
      return parseInt(id, 10);
    });
  }

  setShopAsInvalid(shopId, status, errorMessage, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('invalid', true)
      .set('sync_status', status)
      .set('error', errorMessage)
      .set('last_sync_timestamp', pgSquel.str('NOW()'))
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  resetInvalidFlag(shopId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('invalid', false)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  resetError(shopId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('error', null)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  setShopStatus(shopId, status, invalid = false, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('sync_status', status)
      .set('last_sync_timestamp', pgSquel.str('NOW()'))
      .set('invalid', invalid)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  updateShopName(shopId, name, db) {
    const connection = db || this._db;

    const {text, values} = pgSquel
      .update()
      .table('shops')
      .set('name', name)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  updateShopDomain(shopId, domain, db) {
    const connection = db || this._db;

    const {text, values} = pgSquel
      .update()
      .table('shops')
      .set('domain', domain)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  updateShopUsesInventory(shopId, usesInventory, db) {
    const connection = db || this._db;

    const {text, values} = pgSquel
      .update()
      .table('shops')
      .set('inventory', usesInventory)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  updateShopUserId(shopId, userId, db) {
    const connection = db || this._db;

    const {text, values} = pgSquel
      .update()
      .table('shops')
      .set('channel_user_id', userId)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  syncStartedEtsy(shopId, uploadCount, downloadCount, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }
    if (!_.isFinite(uploadCount)) { return Promise.reject(new TypeError(`Bad input value: uploadCount=${uploadCount}`)); }
    if (!_.isFinite(downloadCount)) { return Promise.reject(new TypeError(`Bad input value: downloadCount=${downloadCount}`)); }

    const connection = db || this._db;
    const syncStatusValue = `CASE WHEN sync_status is null THEN '${constants.SHOP_SYNC_STATUS_INITIAL_SYNC}' WHEN sync_status = '${constants.SHOP_SYNC_STATUS_INITIAL_SYNC}' THEN '${constants.SHOP_SYNC_STATUS_INITIAL_SYNC}' ELSE '${constants.SHOP_SYNC_STATUS_SYNC}' END`;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('to_upload', uploadCount)
      .set('uploaded', 0)
      .set('to_download', downloadCount)
      .set('downloaded', 0)
      .set('sync_status', pgSquel.str(syncStatusValue))
      .where('id = ?::bigint', shopId)
      .returning('id')
      .toParam();

    return connection.any(text, values);
  }

  async syncStarted(shopId, syncStatusCheck = true, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }

    const connection = db || this._db;
    const syncStatusValue = `CASE WHEN sync_status is null THEN '${constants.SHOP_SYNC_STATUS_INITIAL_SYNC}' ELSE '${constants.SHOP_SYNC_STATUS_SYNC}' END`;

    return connection.tx(async transaction => {
      // lock row in db
      let query = pgSquel
        .select()
        .from('shops')
        .where('id = ?::bigint', shopId)
        .forUpdate()
        .toParam();
      const shop = await transaction.one(query.text, query.values);
      // shop cannot be syncing
      if (syncStatusCheck && (shop.sync_status === constants.SHOP_SYNC_STATUS_INITIAL_SYNC || shop.sync_status ===  constants.SHOP_SYNC_STATUS_SYNC)) {
        throw new Error('Sync is already in progress');
      }
      // update status
      query = pgSquel // eslint-disable-line no-redeclare
        .update()
        .table('shops')
        .set('to_upload', 0)
        .set('uploaded', 0)
        .set('to_download', 0)
        .set('downloaded', 0)
        .set('sync_status', pgSquel.str(syncStatusValue))
        .where('id = ?::bigint', shopId)
        .toParam();
      return transaction.none(query.text, query.values);
    });
  }

  async updateSyncCounters(shopId, uploadCount, downloadCount, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('to_upload = to_upload + ?', uploadCount)
      .set('uploaded', 0)
      .set('to_download = to_download + ?', downloadCount)
      .set('downloaded', 0)
      .where('id = ?::bigint', shopId)
      .toParam();
    return connection.none(text, values);
  }

  _incrementSyncProgress(shopId, count, columnName, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }
    if (!_.isFinite(count)) { return Promise.reject(new TypeError(`Bad input value: count=${count}`)); }
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set(`${columnName} = ${columnName} + ${count}`)
      .where('id = ?::bigint', shopId)
      .returning('id')
      .toParam();

    return connection.many(text, values);
  }

  uploadProductFinished(shopId, count = 1, db) {
    return this._incrementSyncProgress(shopId, count, 'uploaded', db);
  }

  downloadProductFinished(shopId, count = 1, db) {
    return this._incrementSyncProgress(shopId, count, 'downloaded', db);
  }

  syncFinished(shopId, incomplete, error, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }
    const connection = db || this._db;

    const query = pgSquel.update()
      .table('shops')
      .set('last_sync_timestamp', pgSquel.str('NOW()'))
      .set('sync_status', incomplete ? constants.SHOP_SYNC_STATUS_INCOMPLETE : constants.SHOP_SYNC_STATUS_UPTODATE)
      .set('error', error || null);

    if (!incomplete) {
      query
        .set('to_upload', 0)
        .set('uploaded', 0)
        .set('to_download', 0)
        .set('downloaded', 0);
    }

    const { text, values } = query
      .where('id = ?::bigint', shopId)
      .returning('id')
      .toParam();

    return connection.any(text, values);
  }

  applyStarted(shopId, count, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }
    if (!_.isFinite(count)) { return Promise.reject(new TypeError(`Bad input value: count=${count}`)); }

    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('applying_operations', true)
      .set('to_apply', count)
      .set('applied', 0)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  incrementApplyProgress(shopId, count, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }
    if (!_.isFinite(count)) { return Promise.reject(new TypeError(`Bad input value: count=${count}`)); }
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set(`applied = applied + ${count}`)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  applyFinished(shopId, db) {
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: shopId=${shopId}`)); }
    const connection = db || this._db;

    const { text, values } = pgSquel.update()
      .table('shops')
      .set('applying_operations', false)
      .set('applied', 0)
      .set('to_apply', 0)
      .where('id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  // set property describing when was the shop last time synced
  // the property is used for scheduling sync shop jobs
  // timestamp should be passed in *milliseconds*, in DB it is stored in second resolution
  setLastSyncTimestamp(accountId, shopId, timestamp, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .update()
      .table('shops')
      .set('last_sync_timestamp', timestamp)
      .where('account_id=?::bigint', accountId)
      .where('id=?::bigint', shopId)
      .toParam();
    return connection.none(text, values);
  }

  getById(shopId, db) {
    const connection = db || this._db;
    // we need shopId
    if (!_.isString(shopId) && !_.isNumber(shopId)) { return Promise.reject(new TypeError(`Bad input value: ${shopId}`)); }
    const { text, values } = pgSquel
      .select()
      .from('shops')
      .distinct()
      .field('shops.*')
      .field('accounts.channel_id')
      .field('channels.name', 'channel')
      .join('accounts', 'accounts', 'shops.account_id=accounts.id')
      .join('channels', 'channels', 'accounts.channel_id=channels.id')
      .where('shops.id=?::bigint', shopId)
      .toParam();

    return connection.oneOrNone(text, values);
  }

  getByIds(ids) {
    // if there are no ids, then return empty array
    if (!ids.length) { return Promise.resolve([]); }
    const { text, values } = pgSquel
      .select()
      .from('shops')
      .where('id IN ?', ids)
      .toParam();
    // make SQL query
    return this._db.any(text, values);
  }

  deleteById(id, db) {
    const connection = db || this._db;

    if (!_.isString(id) && !_.isNumber(id)) { return Promise.reject(new TypeError(`Bad input value: ${id}`)); }
    const sql = `SELECT deleteShop(${id})`;
    return connection.any(sql, []);
  }

  getByCompanyId(companyId, offset = 0, limit = 20) {
    // we need companyId
    if (!_.isString(companyId) && !_.isNumber(companyId)) { return Promise.reject(new TypeError(`Bad input value: ${companyId}`)); }
    // TODO: use prepared queries. Where they will be created?
    const { text, values } = pgSquel
      .select()
      .from('shops')
      .distinct()
      .field('shops.*')
      .field('accounts.channel_id')
      .join('accounts', 'accounts', 'shops.account_id=accounts.id')
      .where('company_id=?::bigint', companyId)
      .order('id')
      .offset(offset)
      .limit(limit)
      .toParam();
    // make SQL query
    return this._db.any(text, values).then((rows) => {
      // normalize response
      return utils.build(rows);
    });
  }

  getByCompanyIdCount(companyId) {
    // TODO: use prepared queries. Where they will be created?
    const { text, values } = pgSquel
      .select()
      .from('shops')
      .field('count(DISTINCT shops.id)')
      .join('accounts', 'accounts', 'shops.account_id = accounts.id')
      .where('accounts.company_id=?::bigint', companyId)
      .toParam();
    // make SQL query
    return this._db.one(text, values).then((row) => {
      // normalize response
      return { count: row.count };
    });
  }

  getByChannelShopId(channelShopId) {
    const { text, values } = pgSquel
      .select()
      .from('shops')
      .where('channel_shop_id=?::text', channelShopId)
      .toParam();
    // make SQL query
    return this._db.any(text, values);
  }

// select distinct(shops.id) as shop_id, accounts.company_id from shops inner join accounts on shops.account_id=accounts.id where shops.id=2;

  verify(shopId, companyId) {
    // if there is no shopId or companyId return failed promise
    if (!shopId || !companyId) { return Promise.reject(); }

    const { text, values } = pgSquel
      .select()
      .distinct()
      .field('shops.id', 'shop_id')
      .field('accounts.company_id')
      .from('shops')
      .join('accounts', 'accounts', 'shops.account_id=accounts.id')
      .where(pgSquel.expr()
        .and('shops.id = ?::bigint', shopId)
        .and('accounts.company_id = ?::bigint', companyId))
      .toParam();
    // make SQL query
    return this._db.any(text, values).then((rows) => rows && rows.length === 1);
  }

  getShopCount() {
    const { text, values } = pgSquel
      .select()
      .field('count(*)')
      .from('shops')
      .toParam();
    return this._db.one(text, values).then((result) => result.count);
  }

  getEtsyShopCount() {
    const { text, values } = pgSquel
      .select()
      .field('count(distinct channel_shop_id)')
      .from('shops')
      .toParam();
    return this._db.one(text, values).then((result) => result.count);
  }

  searchShops(query) {
    const nonNullQuery = (query || query === 0) ? query : '';
    const escapedQuery =
      utils.escapePostgresLikeQuery(String(nonNullQuery).toLowerCase());
    const { text, values } = pgSquel
      .select()
      .from('shops')
      .field('id')
      .field('name')
      .field('channel_shop_id')
      .field('error')
      .where(`LOWER(name) LIKE ?`, `%${escapedQuery}%`)
      .limit(30)
      .toParam();
    return this._db.any(text, values);
  }
}
