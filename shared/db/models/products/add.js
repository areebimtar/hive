import pgSquel from '../../../pgSquel';
import { FIELDS } from '../../../modules/etsy/constants';
import { convertProductToDBData } from '../../../modules/etsy/convertProduct';

export const insert = async (db, product) => {
  const normalizedProduct = convertProductToDBData(product);
  // FIXME: remove setting on new schema flag
  normalizedProduct[FIELDS.ON_NEW_SCHEMA] = true;

  const {text, values } = pgSquel
    .insert()
    .into('product_properties')
    .setFields(normalizedProduct)
    .onConflict('listing_id, shop_id', normalizedProduct)
    .returning('id')
    .toParam();

  const row = await db.one(text, values);
  return row.id;
};
