import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../pgSquel';

export class Sections {
  constructor(db) {
    this._db = db;
  }

  deleteByShopId(shopId, _db) {
    const connection = _db || this._db;
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Bad shop id value: ${shopId}`)); }

    const { text, values } = pgSquel
      .delete()
      .from('shop_sections')
      .where('shop_id=?::bigint', shopId)
      .toParam();

    return connection.none(text, values);
  }

  deleteByIds(shopId, ids, _db) {
    const connection = _db || this._db;
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Bad shop id value: ${shopId}`)); }
    if (!_.isArray(ids)) { return Promise.reject(new TypeError(`Bad ids: ${ids}`)); }

    const { text, values } = pgSquel
      .delete()
      .from('shop_sections')
      .where(pgSquel.expr()
        .and('shop_id=?::bigint', shopId)
        .and('id in ?', ids)
      )
      .toParam();

    return connection.none(text, values);
  }

  getSection(shopId, sectionId, _db) {
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Bad shop id value: ${shopId}`)); }
    if (!_.isNumber(sectionId) && !_.isString(sectionId)) { return Promise.reject(new TypeError(`Bad sectionId value: ${sectionId}`)); }

    const connection = _db || this._db;
    const { text, values } = pgSquel
      .select()
      .from('shop_sections')
      .where(pgSquel.expr()
        .and('shop_id=?::bigint', shopId)
        .and('id=?::bigint', sectionId)
      )
      .toParam();

    return connection.oneOrNone(text, values);
  }

  getSectionBySectionId(shopId, sectionId, _db) {
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Bad shop id value: ${shopId}`)); }
    if (!_.isNumber(sectionId) && !_.isString(sectionId)) { return Promise.reject(new TypeError(`Bad sectionId value: ${sectionId}`)); }

    const connection = _db || this._db;
    const { text, values } = pgSquel
      .select()
      .from('shop_sections')
      .where(pgSquel.expr()
        .and('shop_id=?::bigint', shopId)
        .and('section_id=?::bigint', sectionId)
      )
      .toParam();

    return connection.any(text, values);
  }

  getSections(shopId, _db) {
    const db = _db || this._db;
    const { text, values } = pgSquel
      .select()
      .from('shop_sections')
      .where('shop_id = ?::bigint', shopId)
      .toParam();
    // make SQL query
    return db.any(text, values).then((rows) => {
      // map section ids
      const ids = _.map(rows, row => row.id);
      // make hive_section_id -> value
      const response = _.reduce(rows, (result, row) => { result[row.id] = row; return result; }, { shopId, ids });
      // we are done
      return response;
    });
  }

  // Sections is an array of section names or {name, section_id} objects
  insert(shopId, sections, _db) {
    const db = _db || this._db;
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Bad shop id value: ${shopId}`)); }
    if (!_.isArray(sections)) { return Promise.reject(new TypeError(`Sections is not an array: ${sections}`)); }

    if (!sections.length) { return Promise.resolve([]); } // Nothing to insert

    // get rows to insert
    const rowsToInsert = _.map(sections, (section) => {
      return { shop_id: shopId, value: section.name, section_id: section.section_id || null };
    });

    // compose query
    const { text, values } = pgSquel
      .insert()
      .into('shop_sections')
      .setFieldsRows(rowsToInsert)
      .returning('id, value')
      .toParam();

    // make SQL query
    return db.any(text, values).then((rows) => {
      // return map of value -> id
      return _.reduce(rows, (result, row) => { result[row.value] = row.id; return result; }, {});
    });
  }

  // Set new `section_id` and `value` for section specified by `shop_id` and `id`
  update(shopId, sectionId, section, _db) {
    const connection = _db || this._db;
    if (!_.isNumber(shopId) && !_.isString(shopId)) { return Promise.reject(new TypeError(`Bad shop id value: ${shopId}`)); }
    if (!_.isNumber(sectionId) && !_.isString(sectionId)) { return Promise.reject(new TypeError(`Bad section id value: ${sectionId}`)); }

    const { text, values } = pgSquel
      .update()
      .table('shop_sections')
      .set('section_id', section.section_id)
      .set('value', section.name)
      .where(pgSquel.expr()
        .and('id=?::bigint', sectionId)
        .and('shop_id=?::bigint', shopId)
      )
      .toParam();

    return connection.none(text, values);
  }
}
