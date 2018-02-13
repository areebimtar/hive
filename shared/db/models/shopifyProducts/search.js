import _ from 'lodash';
import Promise from 'bluebird';
import { getByIds, getFilteredIds, getFilteredIdsCount } from './get';
import { FIELDS } from '../../../modules/shopify/constants';
import { searchGroupConverter } from './searchConverter';

const FILTER_GROUPS = [FIELDS.TAGS, FIELDS.PRODUCT_TYPE, FIELDS.VENDOR, FIELDS.PUBLISHED_AT];

const getRelGroupFilters = async (db, group, productIds, shopId) => {
  const converter = searchGroupConverter[group];
  if (!converter) { return {}; }

  const query = converter(productIds, shopId);
  if (!query) { return {}; }

  const { text, values } = query.toParam();
  const rows = await db.any(text, values);

  return _.reduce(rows, (result, row) => row[group] ? _.merge(result, { [row[group]]: parseInt(row.count, 10) }) : result, {});
};

const getGroupFilters = async (db, shopId, filters, group) => {
  // get filters without current group
  const partialFilters = _.cloneDeep(filters);
  if (partialFilters[group]) {
    delete partialFilters[group];
  }
  // get filtered products SELECT query
  const productIdsQuery = getFilteredIds(db, shopId, partialFilters, null, null);

  const groupFilters = await getRelGroupFilters(db, group, productIdsQuery, shopId);
  return { [group]: groupFilters };
};

export const getFiltered = async (db, shopId, offset, limit, fields, filters) => {
  // get filtered ids query
  const productIdsQuery = getFilteredIds(db, shopId, filters, offset, limit);
  return getByIds(db, productIdsQuery, fields);
};

export const getFilteredCount = (db, shopId, filters) => {
  // get filtered products count
  return getFilteredIdsCount(db, shopId, filters);
};

export const getFilteredFilters = async (db, shopId, filters) => {
  const groupFiltersData = await Promise.map(FILTER_GROUPS, group => getGroupFilters(db, shopId, filters || {}, group));
  const groupFilters = _.reduce(groupFiltersData, (result, groupFilter) => _.merge(result, groupFilter), {});

  return { filters: groupFilters };
};
