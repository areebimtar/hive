export const FIELDS = {
  LISTING_ID: 'listing_id',
  STATE: 'state',
  TITLE: 'title',
  DESCRIPTION: 'description',
  TAXONOMY_ID: 'taxonomy_id',
  SECTION_ID: 'section_id',
  SHOP_SECTION_ID: 'shop_section_id',
  TAGS: 'tags',
  MATERIALS: 'materials',
  CREATION_TSZ: 'creation_tsz',
  ENDING_TSZ: 'ending_tsz',
  STATE_TSZ: 'state_tsz',
  LAST_MODIFIED_TSZ: 'last_modified_tsz',

  ID: 'id',
  SHOP_ID: 'shop_id',
  PRICE: 'price',
  QUANTITY: 'quantity',
  PHOTOS: 'photos',
  IS_INVALID: '_hive_is_invalid',
  INVALID_REASON: '_hive_invalid_reason',
  MODIFIED_BY_HIVE: 'modified_by_hive',
  HIVE_LAST_MODIFIED_TSZ: '_hive_last_modified_tsz',
  CHANGED_PROPERTIES: '_hive_changed_properties',
  ON_NEW_SCHEMA: '_hive_on_new_schema',
  LAST_SYNC: '_hive_last_sync',
  CAN_WRITE_INVENTORY: 'can_write_inventory',

  VARIATIONS: 'variations',
  PRODUCT_OFFERINGS: 'productOfferings',
  ATTRIBUTES: 'attributes'
};

export const ETSY_PRODUCT = [
  { name: FIELDS.LISTING_ID, required: true, type: 'integer' },
  { name: FIELDS.STATE, required: true, type: 'enum', typeData: { values: ['active', 'inactive', 'draft', 'expired', 'edit', 'unavailable'] } },
  { name: FIELDS.TITLE, type: 'encodedString' },
  { name: FIELDS.DESCRIPTION, type: 'encodedString' },
  { name: FIELDS.TAXONOMY_ID, type: 'integer' },
  { name: FIELDS.SHOP_SECTION_ID, type: 'string', typeData: { allowNull: true }, public: true },
  { name: FIELDS.MATERIALS, type: 'arrayOfStrings' },
  { name: FIELDS.TAGS, type: 'arrayOfStrings' },
  { name: FIELDS.CREATION_TSZ, type: 'date' },
  { name: FIELDS.ENDING_TSZ, type: 'date' },
  { name: FIELDS.STATE_TSZ, type: 'date' },
  { name: FIELDS.LAST_MODIFIED_TSZ, type: 'date' },
  { name: FIELDS.CAN_WRITE_INVENTORY, type: 'boolean' },
  // internal fields
  { name: FIELDS.ID, type: 'string', internal: true },
  { name: FIELDS.SHOP_ID, type: 'integer', internal: true },
  { name: FIELDS.PRICE, type: 'price', internal: true },
  { name: FIELDS.QUANTITY, type: 'integer', internal: true },
  { name: FIELDS.PHOTOS, type: 'arrayOfIntegers', internal: true },
  { name: FIELDS.SECTION_ID, type: 'string', typeData: { allowNull: true }, internal: true },
  { name: FIELDS.IS_INVALID, type: 'boolean', internal: true },
  { name: FIELDS.INVALID_REASON, type: 'string', internal: true },
  { name: FIELDS.MODIFIED_BY_HIVE, type: 'boolean', internal: true },
  { name: FIELDS.HIVE_LAST_MODIFIED_TSZ, type: 'date', internal: true },
  { name: FIELDS.CHANGED_PROPERTIES, type: 'arrayOfStrings', internal: true },
  { name: FIELDS.ON_NEW_SCHEMA, type: 'boolean', internal: true },
  { name: FIELDS.LAST_SYNC, type: 'date', internal: true }
];

// these tags are used for marking what has been changed (outside products table) in CHANGED_PROPERTIES array
export const NON_PRODUCT_FIELDS_TAGS = [FIELDS.VARIATIONS, FIELDS.PRODUCT_OFFERINGS, FIELDS.ATTRIBUTES, FIELDS.PHOTOS, FIELDS.PRICE, FIELDS.QUANTITY];

export const ATTRIBUTES_IDS = {
  OCCASION: '46803063641',
  HOLIDAY: '46803063659'
};
