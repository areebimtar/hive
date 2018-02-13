import Promise from 'bluebird';
import _ from 'lodash';
import * as utils from '../utils';
import pgSquel from '../../pgSquel';

export class Channels {
  constructor(db) {
    this._db = db;
  }

  add(channelId, name, db) {
    const connection = db || this._db;
    const insertQuery = 'INSERT INTO channels (id, name) values ($1::bigint, $2::text) RETURNING id';
    return connection.one(insertQuery, [channelId, name]);
  }

  getAll() {
    const { text, values } = pgSquel
      .select()
      .from('channels')
      .toParam();
    // make SQL query
    return this._db.any(text, values).then((rows) => {
      // normalize response
      return utils.build(rows);
    });
  }

  getById(id) {
    const { text, values } = pgSquel
      .select()
      .from('channels')
      .where('id=?::bigint', id)
      .toParam();
    // make SQL query
    return this._db.any(text, values).then((rows) => {
      // normalize response
      return utils.buildSingle(rows);
    });
  }

  getByIds(ids) {
    // if there are no ids, then return empty array
    if (!ids.length) { return Promise.resolve([]); }
    const { text, values } = pgSquel
      .select()
      .from('channels')
      .where('id IN ?', ids)
      .toParam();
    // make SQL query
    return this._db.any(text, values).then((rows) => {
      // normalize response
      return utils.build(rows);
    });
  }

  getByName(name, db) {
    if (!_.isString(name)) { return Promise.reject(new TypeError(`Bad input value: ${name}`)); }
    const connection = db || this._db;
    const { text, values } = pgSquel
      .select()
      .from('channels')
      .where('name=?', name)
      .toParam();
    return connection.manyOrNone(text, values).then((rows) => {
      if (rows && rows.length) { return utils.buildSingle(rows); }
      return undefined;
    });
  }

}
