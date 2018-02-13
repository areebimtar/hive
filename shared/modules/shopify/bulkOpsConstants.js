
export const BULK_EDIT_OP_CONSTS = {
  // title
  TITLE_ADD_BEFORE: 'title.addBefore',
  TITLE_ADD_AFTER: 'title.addAfter',
  TITLE_FIND_AND_REPLACE: 'title.findAndReplace',
  TITLE_DELETE: 'title.delete',
  TITLE_SET: 'title.set',

  // description
  BODY_HTML_ADD_BEFORE: 'body_html.addBefore',
  BODY_HTML_ADD_AFTER: 'body_html.addAfter',
  BODY_HTML_FIND_AND_REPLACE: 'body_html.findAndReplace',
  BODY_HTML_DELETE: 'body_html.delete',
  BODY_HTML_SET: 'body_html.set',

  // tags
  TAGS_ADD: 'tags.add',
  TAGS_DELETE: 'tags.delete',

  // photos
  PHOTOS_ADD: 'photos.add',
  PHOTOS_REPLACE: 'photos.replace',
  PHOTOS_DELETE: 'photos.delete',
  PHOTOS_SWAP: 'photos.swap',

  // product type
  PRODUCT_TYPE_SET: 'product_type.set',

  // vendor
  VENDOR_SET: 'vendor.set'
};

export const BULK_EDIT_VALIDATIONS = {
  TITLE_MAX_LENGTH: 255,
  TAGS_MAX_LENGTH: 255,
  TAG_MAX_LENGTH: 255,
  PHOTOS_LENGTH: 10,
  PHOTOS_MAX_LENGTH: 255,
  PRODUCT_TYPE_MAX_LENGTH: 255,
  PHOTO_SIZE_MAX: 4472,
  PHOTO_SIZE_MIN: 50,
  BODY_HTML_NUMBER_OF_FORMATED_ROWS: 5
};
