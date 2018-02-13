import { BULK_EDIT_OP_CONSTS } from 'global/modules/shopify/bulkOpsConstants';

// dropdow data
export const PREVIEW_OP_DEFAULTS = {
  title: { type: BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE },
  body_html: { type: BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE },
  tags: { type: BULK_EDIT_OP_CONSTS.TAGS_ADD },
  photos: { type: BULK_EDIT_OP_CONSTS.PHOTOS_ADD }
};
