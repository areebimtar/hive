export const MAXIMUM_TAG_LENGTH = 20;
export const MAXIMUM_MATERIAL_LENGTH = 45;
export const MAXIMUM_SECTION_LENGTH = 24;
export const SECTION_EXISTS_MESSAGE = 'You already have a shop section with that name.';
export const MAXIMUM_NUMBER_OF_OPTIONS = 70;
export const MAXIMUM_CUSTOM_PROPERTY_NAME_LENGTH = 45;
export const MAXIMUM_OPTION_NAME_LENGTH = 20;

export const MAXIMUM_PROFILE_NAME_LENGTH = 50;
export const MAXIMUM_SKU_LENGTH = 32;
export const MAXIMUM_QUANTITY = 999;

export const MAXIMUM_PRICE_VALUE = 250000;

export const MAXIMUM_VARIATION_OPTION_COMBINATION_COUNT = 400;

export const BULK_EDIT_OP_CONSTS = {
  // title
  TITLE_ADD_BEFORE: 'title.addBefore',
  TITLE_ADD_AFTER: 'title.addAfter',
  TITLE_FIND_AND_REPLACE: 'title.findAndReplace',
  TITLE_DELETE: 'title.delete',
  TITLE_SET: 'title.set',

  // description
  DESCRIPTION_ADD_BEFORE: 'description.addBefore',
  DESCRIPTION_ADD_AFTER: 'description.addAfter',
  DESCRIPTION_FIND_AND_REPLACE: 'description.findAndReplace',
  DESCRIPTION_DELETE: 'description.delete',
  DESCRIPTION_SET: 'description.set',

  // tags
  TAGS_ADD: 'tags.add',
  TAGS_DELETE: 'tags.delete',

  // materials
  MATERIALS_ADD: 'materials.add',
  MATERIALS_DELETE: 'materials.delete',

  // taxonomy
  TAXONOMY_SET: 'taxonomy.set',

  // section
  SECTION_SET: 'section.set',

  // photos
  PHOTOS_ADD: 'photos.add',
  PHOTOS_REPLACE: 'photos.replace',
  PHOTOS_DELETE: 'photos.delete',
  PHOTOS_SWAP: 'photos.swap',

  // INVENTORY
  VARIATIONS_INVENTORY_CHANGE_TO: 'variationsInventory.changeTo',

  // quantity inventory
  QUANTITY_INVENTORY_INCREASE_BY: 'quantityInventory.increaseBy',
  QUANTITY_INVENTORY_DECREASE_BY: 'quantityInventory.decreaseBy',
  QUANTITY_INVENTORY_CHANGE_TO: 'quantityInventory.changeTo',

  SKU_INVENTORY_ADD_BEFORE: 'skuInventory.addBefore',
  SKU_INVENTORY_ADD_AFTER: 'skuInventory.addAfter',
  SKU_INVENTORY_FIND_AND_REPLACE: 'skuInventory.findAndReplace',
  SKU_INVENTORY_DELETE: 'skuInventory.delete',
  SKU_INVENTORY_CHANGE_TO: 'skuInventory.changeTo',

  PRICE_INVENTORY_INCREASE_BY: 'priceInventory.increaseBy',
  PRICE_INVENTORY_DECREASE_BY: 'priceInventory.decreaseBy',
  PRICE_INVENTORY_CHANGE_TO: 'priceInventory.changeTo',

  // ocassion
  OCCASION_SET: 'occasion.set',

  // ocassion
  HOLIDAY_SET: 'holiday.set'
};

export const INVENTORY_OP_TYPES = [
  'variationsInventory',
  'quantityInventory',
  'skuInventory',
  'priceInventory'
];

export const ATTRIBUTES_OP_TYPES = [
  'occasion',
  'holiday'
];

export const BULK_EDIT_VALIDATIONS = {
  TITLE_MAX_LENGTH: 140,
  TITLE_NUMBER_OF_FORMATED_ROWS: 6,
  TAGS_MAX_LENGTH: 13,
  STYLE_MAX_LENGTH: 2,
  MATERIALS_MAX_LENGTH: 13,
  SECTION_MAX_LENGTH: 20,
  PHOTOS_LENGTH: 10,
  PHOTOS_MAX_LENGTH: 10,
  PHOTO_SIZE_MIN: 50,
  PHOTO_SIZE_MAX: 3000
};

export const PRICE_TYPE = [
  { value: 'absolute', text: '$' },
  { value: 'percentage', text: '%' }
];

export const ItemTypes = {
  PHOTO_THUMBNAIL: 'photo_thumbnail',
  OPTION: 'option'
};

export const INVENTORY_TYPE_PRICE = 1;
export const INVENTORY_TYPE_QUANTITY = 2;
export const INVENTORY_TYPE_SKU = 3;
export const INVENTORY_TYPE_VISIBILITY = 4;

export const INVENTORY_TABS_TYPES_DATA = {
  1: { code: 'price', influence: 'influencesPrice', globalLabel: 'Price', checkboxLabel: 'Pricing'},
  2: { code: 'quantity', influence: 'influencesQuantity', globalLabel: 'Quantity', checkboxLabel: 'Quantity'},
  3: { code: 'sku', influence: 'influencesSku', globalLabel: 'SKU', checkboxLabel: 'SKU'},
  4: { code: 'visibility', influence: null, globalLabel: null, checkboxLabel: null }
};

export const INVENTORY_TABS_TYPES = {
  1: 'price',
  2: 'quantity',
  3: 'sku',
  4: 'visibility'
};

export const INFLUENCING_TYPES = [INVENTORY_TYPE_PRICE, INVENTORY_TYPE_QUANTITY, INVENTORY_TYPE_SKU];

export const INVENTORY_TABS_TYPES_INFLUENCE = {
  1: 'influencesPrice',
  2: 'influencesQuantity',
  3: 'influencesSku',
  4: null
};

export const INVENTORY_TABS_TYPES_CHECKBOX_MSG = {
  1: 'Pricing',
  2: 'Quantity',
  3: 'SKU',
  4: null
};
