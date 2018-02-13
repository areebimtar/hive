import pgSquel from '../../pgSquel';
import * as utils from '../utils';

const USER_FIELDS_TO_SELECT = [
  'id', 'email', 'company_id', 'first_name', 'last_name',
  'created_at', 'first_login', 'last_login',
  'login_count', 'admin', 'db', 'type'
];

export class Users {
  constructor(db) {
    this._db = db;
  }

  isAdmin(userId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('hive_auth.users')
      .field('admin')
      .where('id = ?::bigint', userId)
      .toParam();

    return connection.oneOrNone(text, values).then(user => {
      if (user) {
        return user.admin;
      } else {
        throw new Error(`No user for given user id.`);
      }
    });
  }

  getByCompanyId(companyId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('hive_auth.users')
      .field('id')
      .field('email')
      .where('company_id = ?::bigint', companyId)
      .toParam();

    return connection.any(text, values);
  }

  getById(userId, db) {
    const connection = db || this._db;

    let query = pgSquel
      .select()
      .from('hive_auth.users');
    query = USER_FIELDS_TO_SELECT.reduce(
      (queryAcc, field) => queryAcc.field(field), query);
    const { text, values } = query
      .where('id = ?::bigint', userId)
      .toParam();

    return connection.oneOrNone(text, values);
  }

  searchUsers(query) {
    const nonNullQuery = (query || query === 0) ? query : '';
    const escapedQuery =
      utils.escapePostgresLikeQuery(String(nonNullQuery).toLowerCase());
    const { text, values } = pgSquel
      .select()
      .from('hive_auth.users')
      .field('id')
      .field('email')
      .field('company_id')
      .where(`LOWER(email) LIKE ?`, `%${escapedQuery}%`)
      .limit(30)
      .toParam();
    return this._db.any(text, values);
  }
}
