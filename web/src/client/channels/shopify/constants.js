import { fromJS } from 'immutable';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from 'global/modules/shopify/bulkOpsConstants';

import * as title from 'global/modules/shopify/bulkEditOps/validate/title';
import * as tags from 'global/modules/shopify/bulkEditOps/validate/tags';
import * as bodyHtml from 'global/modules/shopify/bulkEditOps/validate/bodyHtml';

export const MENU = fromJS([
  { id: 'listings', title: 'Listings', header: true },
  { id: 'title', title: 'Title' },
  { id: 'body_html', title: 'Description' },
  { id: 'photos', title: 'Photos' },
  { id: 'tags', title: 'Tags' },
  { id: 'product_type', title: 'Product Type' },
  { id: 'vendor', title: 'Vendor' }
]);

export const MENU_OP_CONTAINER_MAP = {
  title: {
    controls: 'ControlsTitle',
    productRow: 'ProductRowTitle',
    uiData: {
      options: [
        { type: BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, text: 'Add Before' },
        { type: BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, text: 'Add After' },
        { type: BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, text: 'Find & Replace' },
        { type: BULK_EDIT_OP_CONSTS.TITLE_DELETE, text: 'Delete' }
      ],
      validators: {
        addBefore: title.validateAddBefore,
        addAfter: title.validateAddAfter,
        replace: title.validateReplace,
        inline: title.validateInput
      }
    },
    classes: {
      [BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE]: 'doubleRow',
      [BULK_EDIT_OP_CONSTS.TITLE_DELETE]: 'singleRow'
    }
  },
  body_html: {
    controls: 'ControlsHtmlBody',
    productRow: 'ProductRowHtmlBody',
    uiData: {
      options: [
        { type: BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE, text: 'Add Before' },
        { type: BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER, text: 'Add After' },
        { type: BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE, text: 'Find & Replace' },
        { type: BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE, text: 'Delete' }
      ],
      validators: {
        addBefore: bodyHtml.validateInput,
        addAfter: bodyHtml.validateInput,
        replace: bodyHtml.validateInputs,
        delete: bodyHtml.validateInput,
        inline: bodyHtml.validateInput
      }
    },
    classes: {
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE]: 'descriptionRow',
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER]: 'descriptionRow',
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE]: 'doubleDescriptionRow',
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE]: 'descriptionRow'
    }
  },
  tags: {
    controls: 'ControlsTags',
    productRow: 'ProductRowTags',
    uiData: {
      options: [
        { type: BULK_EDIT_OP_CONSTS.TAGS_ADD, text: 'Add' },
        { type: BULK_EDIT_OP_CONSTS.TAGS_DELETE, text: 'Delete' }
      ],
      validators: {
        add: tags.validateInput
      }
    },
    classes: {
      [BULK_EDIT_OP_CONSTS.TAGS_ADD]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.TAGS_DELETE]: 'singleRow'
    }
  },
  photos: {
    controls: 'ControlsPhotos',
    productRow: 'ProductRowPhotos',
    uiData: {
      options: [
        { type: BULK_EDIT_OP_CONSTS.PHOTOS_ADD, text: 'Add' },
        { type: BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE, text: 'Replace' },
        { type: BULK_EDIT_OP_CONSTS.PHOTOS_DELETE, text: 'Delete' }
      ],
      validators: {
        PHOTOS_LENGTH: BULK_EDIT_VALIDATIONS.PHOTOS_LENGTH,
        MAX_SIZE: BULK_EDIT_VALIDATIONS.PHOTO_SIZE_MAX,
        MIN_SIZE: BULK_EDIT_VALIDATIONS.PHOTO_SIZE_MIN
      }
    },
    classes: {
      [BULK_EDIT_OP_CONSTS.PHOTOS_ADD]: 'photosRow',
      [BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE]: 'photosRow',
      [BULK_EDIT_OP_CONSTS.PHOTOS_DELETE]: 'photosRow'
    }
  },
  product_type: {
    controls: 'ControlsProductType',
    productRow: 'ProductRowProductType',
    classes: {
      [BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET]: 'productTypeRow'
    }
  },
  vendor: {
    controls: 'ControlsVendor',
    productRow: 'ProductRowVendor',
    classes: {
      [BULK_EDIT_OP_CONSTS.VENDOR_SET]: 'VendorRow'
    }
  }
};
