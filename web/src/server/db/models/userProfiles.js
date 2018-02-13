import pgSquel from '../../../../../shared/pgSquel';
import Logger from 'logger';
import _ from 'lodash';

import * as utils from 'global/db/utils';

export class UserProfiles {
  constructor(db) {
    this._db = db;
  }

  getById(id, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .select()
      .from('user_profiles')
      .where('user_id=?::bigint', id)
      .toParam();
    // make SQL query
    return connection.any(text, values).then((rows) => {
      // normalize response
      return utils.buildSingle(rows);
    });
  }

  // update single property
  _updateSingle(id, name, value, t) {
    const { text, values } = pgSquel
      .select()
      .function('upsertUserProfileRow(?::bigint, ?::text, ?::text)', id, name, value)
      .toParam();

    // log query
    Logger.debug(` query = ${text}`);
    Logger.debug(` params = ${values}`);
    // and finally, query DB
    return t.one(text, values);
  }

  // changedProperties contains key-value pairs of properties to set
  // id is user id - unique identification of user that is part of request session
  update(id, changedProperties, db) {
    const connection = db || this._db;

    return connection.tx(t => {
      const promises = _.map(changedProperties, (value, name) => this._updateSingle(id, name, value, t));
      return t.batch(promises);
    })
    .then(() => null);
  }

}
