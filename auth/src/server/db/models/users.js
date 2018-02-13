import Promise from 'bluebird';
import pgSquel from '../../../../../shared/pgSquel';
import * as utils from 'global/db/utils';

export class Users {
  constructor(db) {
    this._db = db;
  }

  getAll(db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('users')
      .order('id')
      .toParam();

    return connection.any(text, values).then((rows) => utils.build(rows));
  }

  getById(userId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('users')
      .where('id = ?::bigint', userId)
      .toParam();

    return connection.oneOrNone(text, values).then((rows) => utils.build(rows));
  }

  getByEmail(email, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('users')
      .where('email = ?::text', email)
      .toParam();

    return connection.oneOrNone(text, values);
  }

  getByCompanyId(companyId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('users')
      .where('company_id = ?::bigint', companyId)
      .order('id')
      .toParam();

    return connection.any(text, values).then((rows) => utils.build(rows));
  }

  updatePasswordHash(id, passwordHash, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('users')
      .where('id = ?::bigint', id)
      .set('hash', passwordHash)
      .toParam();

    return connection.none(text, values);
  }

  insert(firstname, lastname, email, hash, companyId, dbName, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .insert()
      .into('users')
      .set('first_name', firstname)
      .set('last_name', lastname)
      .set('email', email)
      .set('hash', hash)
      .set('company_id', companyId)
      .set('db', dbName)
      .returning('*')
      .toParam();

    return connection.one(text, values);
  }

  // Given user information set up new user in DB
  // This means creating fresh new company and a user within that company
  // Returns id of newly created user
  createUser(firstname, lastname, email, hash, dbName, db) {
    const connection = db || this._db;
    return connection.tx(t => {
      // We check the email explicitely so we can provide non-cryptic error message to client
      return this.getByEmail(email, t).then(alreadyPresent =>{
        if (alreadyPresent) {
          return Promise.reject(new Error(`Email ${email} is already present in database.`));
        } else {
          return this._createCompany(t).then( id => {
            return this.insert(firstname, lastname, email, hash, id, dbName, t);
          });
        }
      });
    });
  }

  _createCompany(db) {
    const connection = db || this._db;
    const NEW_COMPANY_SQL = 'INSERT INTO COMPANIES DEFAULT VALUES RETURNING ID';
    return connection.one(NEW_COMPANY_SQL, []).then(row => row.id);
  }

  updateUserLoginStatisticsByEmail(email, db) {
    const connection = db || this._db;
    const { text, values } = pgSquel
      .update()
      .table('users')
      .set('first_login', pgSquel.str('CASE WHEN first_login IS NULL THEN now() ELSE first_login END'))
      .set('last_login', pgSquel.str('now()'))
      .set('login_count', pgSquel.str('login_count + 1'))
      .where('email = ?::text', email)
      .toParam();

    return connection.none(text, values);
  }
}
