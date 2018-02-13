import pgSquel from '../../pgSquel';

export class Aggregates {
  constructor(db) {
    this._db = db;
  }

  getByShopId(shopId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('aggregates')
      .where('shop_id = ?::bigint', shopId)
      .toParam();

    return connection.any(text, values);
  }

  getByParentMessageId(parentMessageId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .select()
      .from('aggregates')
      .where('parent_message_id = ?::text', parentMessageId)
      .where('deleted = ?', false)
      .forUpdate()
      .toParam();

    return connection.any(text, values);
  }

  add(shopId, parentMessageId, messageId, status, message, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .insert()
      .into('aggregates')
      .set('shop_id', shopId)
      .set('parent_message_id', parentMessageId)
      .set('message_id', messageId)
      .set('status', status)
      .set('message', message)
      .toParam();

    return connection.none(text, values);
  }

  deleteByShopId(shopId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .delete()
      .from('aggregates')
      .where('shop_id = ?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  markAsDeletedByParentId(parentMessageId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .update()
      .table('aggregates')
      .set('deleted', true)
      .where('parent_message_id = ?::text', parentMessageId)
      .toParam();

    return connection.none(text, values);
  }

  deleteByParentMessageId(parentMessageId, db) {
    const connection = db || this._db;

    const { text, values } = pgSquel
      .delete()
      .from('aggregates')
      .where('parent_message_id = ?::text', parentMessageId)
      .toParam();

    return connection.none(text, values);
  }
}
