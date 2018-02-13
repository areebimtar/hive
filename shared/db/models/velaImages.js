import _ from 'lodash';
import pgSquel from '../../pgSquel';

export class VelaImages {
  constructor(db) {
    this._db = db;
  }

  getByHash(sha, db = this._db) {
    const { text, values } = pgSquel
      .select()
      .from('vela_images')
      .where('hash = ?::text', sha)
      .toParam();

    // make SQL query
    return db.oneOrNone(text, values).then((row) => {
      return row || null;
    });
  }

  insert(image, db = this._db) {
    const { text, values } = pgSquel
      .insert()
      .into('vela_images')
      .setFields(image)
      .returning('id')
      .toParam();

    // make SQL query
    return db.one(text, values).then((row) => {
      return _.get(row, 'id', null);
    });
  }

  upsert(image, db = this._db) {
    const { text, values } = pgSquel
      .insert()
      .into('vela_images')
      .setFields(image)
      .onConflict('hash', image)
      .returning('id')
      .toParam();

    // make SQL query
    return db.one(text, values).then((row) => {
      return _.get(row, 'id', null);
    });
  }
}
