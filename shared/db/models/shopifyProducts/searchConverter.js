import _ from 'lodash';
import pgSquel from '../../../pgSquel';
import { FIELDS } from '../../../modules/shopify/constants';

function getTilteCondition(value) {
  return {
    query: `${FIELDS.TITLE} ILIKE ?`,
    params: `%${value}%`
  };
}

function getTagsCondition(value) {
  return {
    query: `${FIELDS.TAGS} && ?`,
    params: `{${_.map(value, String).join(', ')}}`
  };
}

function getTagsGroupQuery(productIds) {
  const unnestQuery = pgSquel
    .select()
    .field(`unnest(${FIELDS.TAGS})`, FIELDS.TAGS)
    .from('shopify_products')
    .where('id IN ?', productIds);
  return pgSquel
    .select()
    .field(FIELDS.TAGS)
    .field('COUNT(*)')
    .from(unnestQuery, 'unnestSubQuery')
    .group(`unnestSubQuery.${FIELDS.TAGS}`);
}

function getProductTypeCondition(value) {
  return {
    query: 'product_type IN ?',
    params: value
  };
}

function getProductTypeGroupQuery(productIds) {
  return pgSquel
    .select()
    .field(FIELDS.PRODUCT_TYPE)
    .field('COUNT(*)')
    .from('shopify_products')
    .where('id IN ?', productIds)
    .group(FIELDS.PRODUCT_TYPE);
}

function getVendorCondition(value) {
  return {
    query: 'vendor IN ?',
    params: value
  };
}

function getVendorGroupQuery(productIds) {
  return pgSquel
    .select()
    .field(FIELDS.VENDOR)
    .field('COUNT(*)')
    .from('shopify_products')
    .where('id IN ?', productIds)
    .group(FIELDS.VENDOR);
}

function getPublishedAtCondition(value) {
  return {
    query: value === 'published' ? `${FIELDS.PUBLISHED_AT} is not null` : `${FIELDS.PUBLISHED_AT} is null`,
    params: null
  };
}

function getPublishedGroupQuery(productIds, shopId) {
  return pgSquel
    .select()
    .field(`case when ${FIELDS.PUBLISHED_AT} is null then 'unpublished' else 'published' end`, FIELDS.PUBLISHED_AT)
    .field('COUNT(*)')
    .from('shopify_products')
    .group(`${FIELDS.PUBLISHED_AT} is null`)
    .where('shop_id = ?::bigint', shopId);
}

export const searchConverter = {
  [FIELDS.TITLE]: getTilteCondition,
  [FIELDS.TAGS]: getTagsCondition,
  [FIELDS.PRODUCT_TYPE]: getProductTypeCondition,
  [FIELDS.VENDOR]: getVendorCondition,
  [FIELDS.PUBLISHED_AT]: getPublishedAtCondition
};

export const searchGroupConverter = {
  [FIELDS.TAGS]: getTagsGroupQuery,
  [FIELDS.PRODUCT_TYPE]: getProductTypeGroupQuery,
  [FIELDS.VENDOR]: getVendorGroupQuery,
  [FIELDS.PUBLISHED_AT]: getPublishedGroupQuery
};
