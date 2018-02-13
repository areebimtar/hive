import Promise from 'bluebird';
import pgSquel from '../../../pgSquel';

export const deleteByIds = (db, ids) => {
  if (!ids.length) { return Promise.resolve(); }

  const { text, values } = pgSquel.delete()
    .from('product_properties')
    .where('id IN ?', ids)
    .toParam();

  return db.none(text, values);
};

export const deleteByShopId = (db, shopId) => {
  const { text, values } = pgSquel.delete()
    .from('product_properties')
    .where('shop_id=?::bigint', shopId)
    .toParam();

  return db.none(text, values);
};
