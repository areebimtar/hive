import _ from 'lodash';
import Promise from 'bluebird';
import pgSquel from '../../../pgSquel';
import { FIELDS } from '../../../modules/etsy/constants';
import { getFilteredIds, getByIds } from './get.js';

const FILTER_GROUPS = [FIELDS.TAXONOMY_ID, FIELDS.MATERIALS, FIELDS.SECTION_ID, FIELDS.TAGS];

const getRelGroupFilters = async (db, group, productIds) => {
  const valueQuery = pgSquel
    .select()
    .field(group)
    .field('COUNT(*)')
    .from('product_properties')
    .where('id IN ?', productIds)
    .group(group);

  const unnestQuery = pgSquel
    .select()
    .field(`unnest(${group})`, group)
    .from('product_properties')
    .where('id IN ?', productIds);
  const arrayQuery = pgSquel
    .select()
    .field(group)
    .field('COUNT(*)')
    .from(unnestQuery, 'unnestSubQuery')
    .group(`unnestSubQuery.${group}`);

  const subQueryBuilderMap = {
    [FIELDS.TAXONOMY_ID]: valueQuery,
    [FIELDS.SECTION_ID]: valueQuery,
    [FIELDS.TAGS]: arrayQuery,
    [FIELDS.MATERIALS]: arrayQuery
  };

  const query = subQueryBuilderMap[group];
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
  if (_.keys(partialFilters).length < 1) { return {}; }

  // get filtered products SELECT query
  const productIdsQuery = getFilteredIds(db, shopId, partialFilters, null, null);

  const groupFilters = await getRelGroupFilters(db, group, productIdsQuery);
  return { [group]: groupFilters };
};

export const getFilteredOnlyIds = async (db, shopId, offset, limit, filters) => {
  const { text, values } = getFilteredIds(db, shopId, filters, offset, limit).toParam();

  const rows = await db.any(text, values);
  return _.map(rows, 'id');
};

export const getFiltered = async (db, shopId, offset, limit, fields, filters) => {
  // get filtered ids query
  const productIdsQuery = getFilteredIds(db, shopId, filters, offset, limit);
  return getByIds(db, productIdsQuery, fields);
};

export const getFilteredCount = async (db, shopId, filters) => {
  // get filtered products SELECT query
  const productIds = await getFilteredOnlyIds(db, shopId, null, null, filters);
  return { count: productIds.length };
};

export const getFilteredFilters = async (db, shopId, filters) => {
  let groupFilters = {};
  await Promise.each(FILTER_GROUPS, group => getGroupFilters(db, shopId, filters, group)
    .then(result => {
      groupFilters = _.merge(groupFilters, result);
    }));

  return { filters: groupFilters };
};
