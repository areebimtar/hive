import pgSquel from '../../shared/pgSquel';

export async function insert(db, tableName, entity) {
  const { text, values } = pgSquel
    .insert()
    .into(tableName)
    .setFields(entity)
    .toParam();
  await db.none(text, values);
}

export async function deleteFrom(db, tableName, ids) {
  const { text, values } = pgSquel
    .delete()
    .from(tableName)
    .where('id IN ?', ids)
    .toParam();
  await db.none(text, values);
}


export async function select(db, tableName, id) {
  const { text, values } = pgSquel
    .select()
    .from(tableName)
    .where('id=?', id)
    .toParam();
  return db.one(text, values);
}

export async function deleteAllFrom(db, tableName) {
  const { text, values } = pgSquel
    .delete()
    .from(tableName)
    .toParam();
  await db.none(text, values);
}

export async function deleteAllShops(db) {
  await db.any('select deleteshop(id) from shops');
  await db.any(`DELETE FROM images`);
  await db.any(`DELETE FROM vela_images`);
  await db.any(`DELETE FROM accounts`);
}

