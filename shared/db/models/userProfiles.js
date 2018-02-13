import pgSquel from '../../pgSquel';

export class UserProfiles {
  constructor(db) {
    this._db = db;
  }

  getLastSeenShop(userId, db) {
    const connection = db || this._db;
// select property_value from user_profiles where user_id=1 and property_name='last_seen_shop';
    const { text, values } = pgSquel
      .select()
      .from('hive_auth.users')
      .field('property_value', 'shopId')
      .where('id = ?::bigint', userId)
      .where('property_name = ?::text', 'last_seen_shop')
      .toParam();

    return connection.oneOrNone(text, values).then(row => {
      return row && row.shopId || null;
    });
  }
}
