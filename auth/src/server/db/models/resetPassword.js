import pgSquel from '../../../../../shared/pgSquel';
import * as utils from 'global/db/utils';

export class ResetPassword {
  constructor(db) {
    this._db = db;
  }

  getAll(db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('reset_requests')
      .order('id')
      .toParam();

    return connection.any(text, values).then((rows) => utils.build(rows));
  }

  getById(id, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('reset_requests')
      .where('id = ?::bigint', id)
      .toParam();

    return connection.oneOrNone(text, values);
  }

  insert(userId, linkData, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .insert()
      .into('reset_requests')
      .set('user_id', userId)
      .set('link_data', linkData)
      .returning('id')
      .toParam();

    return connection.one(text, values).then(row => row && row.id);
  }

  removeById(id, db) {
    const connection = db || this._db;

    const {text, values } = pgSquel
      .delete()
      .from('reset_requests')
      .where('id = ?::bigint', id)
      .toParam();

    return connection.none(text, values);
  }
}
