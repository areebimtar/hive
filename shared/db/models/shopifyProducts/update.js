import _ from 'lodash';
import Promise from 'bluebird';
import pgSquel from '../../../pgSquel';
import { FIELDS } from '../../../modules/shopify/constants';
import { convertProductToDBData } from '../../../modules/shopify/convertProduct';

const BATCH_SIZE = 5;

export const upsert = async (db, product) => {
  const normalizedProduct = convertProductToDBData(product);

  const {text, values } = pgSquel
    .insert()
    .into('shopify_products')
    .setFields(normalizedProduct)
    .onConflict(`${FIELDS.PRODUCT_ID}, ${FIELDS.SHOP_ID}`, normalizedProduct)
    .returning('id')
    .toParam();

  const row = await db.one(text, values);
  return row.id;
};

export const upsertProducts = async (db, products) => {
  let ids = [];

  const chunks = _.chunk(products, BATCH_SIZE);
  for (let i = 0; i < chunks.length; ++i) {
    const chunk = chunks[i];
    ids = ids.concat(await Promise.map(chunk, product => upsert(db, product)));
  }

  return ids;
};

export const update = (db, product) => {
  const normalizedProduct = convertProductToDBData(product);
  const productId = normalizedProduct[FIELDS.ID];
  delete normalizedProduct[FIELDS.ID];

  const {text, values } = pgSquel
    .update()
    .table('shopify_products')
    .setFields(normalizedProduct)
    .where('id = ?::bigint', productId)
    .toParam();

  return db.none(text, values);
};
