import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

import * as taxonomyUtils from 'global/modules/etsy/bulkEditOps/taxonomyUtils';

// dropdow data
export const PREVIEW_OP_DEFAULTS = {
  title: { type: BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE },
  description: { type: BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE },
  tags: { type: BULK_EDIT_OP_CONSTS.TAGS_ADD },
  taxonomy: { type: BULK_EDIT_OP_CONSTS.TAXONOMY_SET },
  section: { type: BULK_EDIT_OP_CONSTS.SECTION_SET },
  occasion: { type: BULK_EDIT_OP_CONSTS.OCCASION_SET },
  holiday: { type: BULK_EDIT_OP_CONSTS.HOLIDAY_SET },
  materials: { type: BULK_EDIT_OP_CONSTS.MATERIALS_ADD },
  photos: { type: BULK_EDIT_OP_CONSTS.PHOTOS_ADD },
  variationsInventory: {
    type: BULK_EDIT_OP_CONSTS.VARIATIONS_INVENTORY_CHANGE_TO,
    meta: {
      activeTab: 0,
      taxonomyData: {
        indexes: taxonomyUtils.getIndexes(null),
        values: taxonomyUtils.getValues(null),
        options: taxonomyUtils.getOptions(null)
      },
      variationsData: {
        variations: []
      }
    },
    value: {
      taxonomyId: null,
      variations: [],
      scalingOptionId: null
    }
  },
  quantityInventory: { type: BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_INCREASE_BY },
  skuInventory: { type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE },
  priceInventory: { type: BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_INCREASE_BY }
};
