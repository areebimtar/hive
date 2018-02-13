import pgSquel from '../../../pgSquel';
import { FIELDS } from '../../../modules/shopify/constants';

export const deleteByIds = async (db, ids) => {
  const {text, values } = pgSquel
    .delete()
    .from('shopify_products')
    .where(`${FIELDS.ID} IN ?`, ids)
    .toParam();

  return db.none(text, values);
};
