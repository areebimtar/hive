import _ from 'lodash';
import pgSquel from '../../../pgSquel';
import { FIELDS, ETSY_PRODUCT } from '../../../modules/etsy/constants';
import { convertDBDataToProduct } from '../../../modules/etsy/convertProduct';
import { dbTypeConverter } from '../../../modules/etsy/typeConverters';

export const DEFAULT_LIMIT = 100;

const buildFilters = filters => {
  const queries = {
    arrayOfStrings: '&& ?',
    encodedString: 'ILIKE ?'
  };
  const queryParams = {
    encodedString: value => `%${value}%`
  };

  return _.reduce(ETSY_PRODUCT, (result, field) => {
    const filterValue = filters[field.name];
    if (!filterValue) { return result; }

    const converter = dbTypeConverter[field.type];
    if (!converter || !converter.toDB) { return result; }

    const value = converter.toDB(filterValue, field.typeData);
    const defaultQueryOp = _.isArray(value) ? 'IN ?' : '= ?';
    const query = `${field.name} ${queries[field.type] || defaultQueryOp}`;
    const queryValue = (queryParams[field.type] || _.identity)(value);
    return result.and(query, queryValue);
  }, pgSquel.expr());
};

const getProducts = async (db, productIds, fields) => {
  const query = pgSquel
    .select()
    .from('product_properties')
    .fields(fields)
    .where('id IN ?', productIds);
  const {text, values} = query.toParam();
  const products = await db.any(text, values);

  return _.map(products, convertDBDataToProduct);
};

export const getFilteredIds = (db, shopId, filters, offset, limit) => {
  const query = pgSquel
    .select()
    .from('product_properties')
    .field(FIELDS.ID)
    .where('shop_id = ?::bigint', shopId)
    .where(buildFilters(filters))
    .order('id');

  if (offset) {
    query.offset(offset);
  }

  if (limit) {
    query.limit(limit);
  }

  return query;
};

export const getById = async (db, productId) => {
  const products = await getProducts(db, [productId]);
  return _.get(products, 0);
};

export const getByIds = async (db, productIds, fields) => {
  return getProducts(db, productIds, fields);
};

export const getStatusSummariesByShopId = async (db, shopId) => {
  const { text, values } = pgSquel
    .select()
    .field(FIELDS.ID)
    .field(FIELDS.LISTING_ID)
    .field(FIELDS.STATE)
    .field(FIELDS.MODIFIED_BY_HIVE)
    .field(FIELDS.LAST_MODIFIED_TSZ)
    .field(FIELDS.HIVE_LAST_MODIFIED_TSZ)
    .field(FIELDS.CAN_WRITE_INVENTORY)
    .from('product_properties')
    .where('shop_id = ?::bigint', shopId)
    .toParam();

  const products = await db.any(text, values);

  return _.map(products, convertDBDataToProduct);
};

export const getAll = async (db, productIds, offset, limit) => {
  const { text, values } = pgSquel
    .select()
    .from('product_properties')
    .where('id IN ?', productIds)
    .where(`${FIELDS.IS_INVALID} = ?::boolean`, false)
    .offset(offset || 0)
    .limit(limit || DEFAULT_LIMIT)
    .order(FIELDS.ID)
    .toParam();

  const rows = await db.any(text, values);
  const products = _.map(rows, convertDBDataToProduct);
  return products.sort((left, right) => left.id - right.id);
};

export const getStatesCounts = async (db, shopId) => {
  const { text, values } = pgSquel
    .select()
    .from('product_properties')
    .field('state', 'name')
    .field('COUNT(1)', 'count')
    .where(pgSquel.expr()
      .and('shop_id=?::bigint', shopId)
      .and('_hive_is_invalid = ?::boolean', false))
    .group('name')
    .toParam();
  const stateRows = await db.any(text, values);
  return {
    stateCounts: _(stateRows)
      .indexBy('name')
      .mapValues('count')
      .value()
  };
};
