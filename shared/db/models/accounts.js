import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../pgSquel';

export class Accounts {
  constructor(db) {
    this._db = db;
  }

  add(companyId, channelId, token, tokenSecret, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .insert()
      .into('accounts')
      .setFields({
        company_id: companyId,
        channel_id: channelId,
        oauth_token: token,
        oauth_token_secret: tokenSecret
      })
      .returning('id')
      .toParam();

    return connection.one(text, values).get('id').then((id) => { return parseInt(id, 10); });
  }

  getById(id) {
    const { text, values } = pgSquel
      .select()
      .from('accounts')
      .where('id=?::bigint', id)
      .toParam();
    // make SQL query
    return this._db.one(text, values);
  }

  updateCompanyId(accountId, newCompanyId) {
    const { text, values } = pgSquel
      .update()
      .table('accounts')
      .set('company_id', newCompanyId)
      .where('id=?::bigint', accountId)
      .toParam();
    return this._db.none(text, values);
  }

  getByIds(ids) {
    // if there are no ids, then return empty array
    if (!ids.length) { return Promise.resolve([]); }
    const { text, values } = pgSquel
      .select()
      .from('accounts')
      .where('id IN ?', ids)
      .toParam();
    return this._db.any(text, values);
  }

  getByToken(companyId, channelId, token, connection = this._db) {
    if (!_.isString(companyId) && !_.isNumber(companyId)) { return Promise.reject(new TypeError(`Bad input value - companyId: ${companyId}`)); }
    if (!_.isString(channelId) && !_.isNumber(channelId)) { return Promise.reject(new TypeError(`Bad input value - channelId: ${channelId}`)); }
    if (!_.isString(token)) { return Promise.reject(new TypeError(`Bad input value - token: ${token}`)); }

    const { text, values } = pgSquel.select()
      .from('accounts')
      .where('company_id=?::bigint', companyId)
      .where('channel_id=?::bigint', channelId)
      .where('oauth_token=?', token)
      .toParam();

    return connection.any(text, values);
  }

  deleteById(id, db) {
    const connection = db || this._db;
    if (!_.isString(id) && !_.isNumber(id)) { return Promise.reject(new TypeError(`Bad input value: ${id}`)); }

    const { text, values } = pgSquel
      .delete()
      .from('accounts')
      .where('id=?::bigint', id)
      .toParam();

    // make SQL query
    return connection.none(text, values);
  }
}
