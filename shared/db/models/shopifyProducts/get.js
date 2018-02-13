import _ from 'lodash';
import pgSquel from '../../../pgSquel';
import { FIELDS } from 'global/modules/shopify/constants';
import { convertDBDataToProduct } from 'global/modules/shopify/convertProduct';
import { searchConverter } from './searchConverter';

export const DEFAULT_LIMIT = 25;

const buildFilters = filters => {
  return _.reduce(filters, (conditions, value, filter) => {
    const converter = searchConverter[filter];
    if (!converter) { return conditions; }

    const condition = converter(value);
    if (!condition) { return conditions; }

    return conditions.and(condition.query, condition.params);
  }, pgSquel.expr());
};

export const getFilteredIds = (db, shopId, filters, offset, limit) => {
  const query = pgSquel
    .select()
    .from('shopify_products')
    .field(FIELDS.ID)
    .where('shop_id = ?::bigint', shopId)
    .where(buildFilters(filters))
    .offset(offset || 0)
    .order('id');

  if (limit || !_.isNull(limit)) {
    query.limit(limit || DEFAULT_LIMIT);
  }

  return query;
};

export const getFilteredIdsCount = async (db, shopId, filters) => {
  const { text, values } = pgSquel
    .select()
    .from('shopify_products')
    .field('COUNT(*)')
    .where('shop_id = ?::bigint', shopId)
    .where(buildFilters(filters))
    .toParam();

  const row = await db.one(text, values);
  return row.count;
};

const getProducts = async (db, productIds, fields) => {
  const query = pgSquel
    .select()
    .from('shopify_products')
    .where('id IN ?', productIds);

  if (!_.isEmpty(fields)) {
    query.fields(fields);
  }
  const {text, values} = query.toParam();
  const products = await db.any(text, values);

  return _.map(products, convertDBDataToProduct);
};

export const getById = async (db, productId, fields) => {
  const products = await getProducts(db, [productId], fields);
  return _.get(products, 0);
};

export const getByIds = async (db, productIds, fields) => {
  return getProducts(db, productIds, fields);
};

export const getByShopId = async (db, shopId, fields) => {
  const query = pgSquel
    .select()
    .from('shopify_products');

  if (!_.isEmpty(fields)) {
    query.fields(fields);
  }

  query.where('shop_id = ?::bigint', shopId);

  const {text, values} = query.toParam();
  const products = await db.any(text, values);

  return _.map(products, convertDBDataToProduct);
};

export const getStatusSummariesByShopifyProductIds = async (db, shopifyProductIds) => {
  const { text, values } = pgSquel
    .select()
    .field(FIELDS.ID)
    .field(FIELDS.PRODUCT_ID)
    .field(FIELDS.UPDATED_AT)
    .field(FIELDS.MODIFIED_BY_HIVE)
    .field(FIELDS.IS_INVALID)
    .field(FIELDS.CHANGED_PROPERTIES)
    .from('shopify_products')
    .where(`${FIELDS.PRODUCT_ID} IN ?`, shopifyProductIds)
    .toParam();

  const products = await db.any(text, values);

  return _.map(products, convertDBDataToProduct);
};

export const getAll = async (db, productIds, offset, limit) => {
  const { text, values } = pgSquel
    .select()
    .from('shopify_products')
    .where(`${FIELDS.ID} IN ?`, productIds)
    .where(`${FIELDS.IS_INVALID} = ?::boolean`, false)
    .offset(offset || 0)
    .limit(limit || DEFAULT_LIMIT)
    .order(FIELDS.ID)
    .toParam();

  const rows = await db.any(text, values);
  const products = _.map(rows, convertDBDataToProduct);
  return products.sort((left, right) => left.id - right.id);
};

export const getProductTypes = async (db, shopId) => {
  const { text, values } = pgSquel
    .select()
    .from('shopify_products')
    .field(FIELDS.PRODUCT_TYPE)
    .distinct()
    .where('shop_id = ?::bigint', shopId)
    .toParam();

  const rows = await db.any(text, values);
  return _.map(rows, FIELDS.PRODUCT_TYPE);
};

export const getVendors = async (db, shopId) => {
  const { text, values } = pgSquel
    .select()
    .from('shopify_products')
    .field(FIELDS.VENDOR)
    .distinct()
    .where('shop_id = ?::bigint', shopId)
    .toParam();

  const rows = await db.any(text, values);
  return _.map(rows, FIELDS.VENDOR);
};
