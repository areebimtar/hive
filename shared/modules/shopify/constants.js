export const FIELDS = {
  ID: 'id',
  PRODUCT_ID: 'product_id',
  TITLE: 'title',
  BODY_HTML: 'body_html',
  IMAGES: 'images',
  PHOTOS: 'photos',
  TAGS: 'tags',
  PRODUCT_TYPE: 'product_type',
  VENDOR: 'vendor',
  SHOP_ID: 'shop_id',
  PUBLISHED_AT: 'published_at',
  UPDATED_AT: 'updated_at',
  IS_INVALID: '_hive_is_invalid',
  INVALID_REASON: '_hive_invalid_reason',
  HIVE_UPDATED_AT: '_hive_updated_at',
  MODIFIED_BY_HIVE: '_hive_modified_by_hive',
  CHANGED_PROPERTIES: 'changed_properties',
  LAST_SYNC: 'last_sync'
};

export const SHOPIFY_PRODUCT = [
  { name: FIELDS.PRODUCT_ID, shopifyName: FIELDS.ID, required: true, type: 'bigint' },
  { name: FIELDS.TITLE, type: 'string' },
  { name: FIELDS.BODY_HTML, type: 'string' },
  { name: FIELDS.PHOTOS, shopifyName: FIELDS.IMAGES, type: 'arrayOfImages' },
  { name: FIELDS.TAGS, type: 'arrayOfStrings' },
  { name: FIELDS.PRODUCT_TYPE, type: 'productType' },
  { name: FIELDS.VENDOR, type: 'vendor' },
  { name: FIELDS.PUBLISHED_AT, type: 'date', typeData: { allowNull: true } },
  { name: FIELDS.UPDATED_AT, type: 'date' },
  // internal fields
  { name: FIELDS.ID, type: 'string', internal: true },
  { name: FIELDS.SHOP_ID, type: 'integer', internal: true },
  { name: FIELDS.IS_INVALID, type: 'boolean', internal: true },
  { name: FIELDS.INVALID_REASON, type: 'string', internal: true },
  { name: FIELDS.MODIFIED_BY_HIVE, type: 'boolean', internal: true },
  { name: FIELDS.HIVE_UPDATED_AT, type: 'date', internal: true },
  { name: FIELDS.CHANGED_PROPERTIES, type: 'arrayOfStrings', internal: true },
  { name: FIELDS.LAST_SYNC, type: 'date', internal: true }
];

// these tags are used for marking what has been changed (outside products table) in CHANGED_PROPERTIES array
export const NON_PRODUCT_FIELDS_TAGS = [FIELDS.IMAGES];

export const MAX_PRODUCTS_IN_QUERY = 250;
