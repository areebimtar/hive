import Promise from 'bluebird';
import _ from 'lodash';
import pgSquel from '../../../pgSquel';
import { convertProductToDBData } from '../../../modules/etsy/convertProduct';
import { checkType } from '../../../modules/utils/check';

export async function updateProduct(db, product) {
  checkType(_.isString(product.id) || _.isFinite(product.id), `bad productId: ${product.id}`);

  const normalizedProduct = convertProductToDBData(product);

  const {text, values } = pgSquel
    .update()
    .table('product_properties')
    .setFields(normalizedProduct)
    .where('id = ?', product.id)
    .toParam();

  return db.none(text, values);
}

export async function updateProducts(db, products) {
  const chunks = _.chunk(products, 5);
  for (let i = 0; i < chunks.length; ++i) {
    await Promise.map(chunks[i], product => updateProduct(db, product));
  }
}
