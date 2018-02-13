import { fromJS } from 'immutable';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from 'global/modules/etsy/bulkOpsConstants';

import * as title from 'global/modules/etsy/bulkEditOps/validate/title';
import * as tags from 'global/modules/etsy/bulkEditOps/validate/tags';

export const MENU = fromJS([
  { id: 'listings', title: 'Listings', header: true },
  { id: 'title', title: 'Title' },
  { id: 'description', title: 'Description' },
  { id: 'taxonomy', title: 'Category' },
  { id: 'photos', title: 'Photos' },
  { id: 'tags', title: 'Tags' },
  { id: 'materials', title: 'Materials' },
  { id: 'section', title: 'Section' },
  { id: 'occasion', title: 'Occasion' },
  { id: 'holiday', title: 'Holiday' },
  { id: 'inventory', title: 'Inventory', header: true },
  { id: 'variationsInventory', title: 'Variations' },
  { id: 'priceInventory', title: 'Price' },
  { id: 'quantityInventory', title: 'Quantity' },
  { id: 'skuInventory', title: 'SKU' }
]);

export const MENU_OP_CONTAINER_MAP = {
  title: {
    controls: 'ControlsTitle',
    productRow: 'ProductRowTitle',
    uiData: {
      BULK_EDIT_OP_CONSTS,
      options: [
        { type: BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE, text: 'Add Before' },
        { type: BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER, text: 'Add After' },
        { type: BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE, text: 'Find & Replace' },
        { type: BULK_EDIT_OP_CONSTS.TITLE_DELETE, text: 'Delete' }
      ],
      validators: {
        addBefore: title.validateAddBefore,
        addAfter: title.validateAddAfter,
        replace: title.validateReplace
      }
    },
    classes: {
      [BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE]: 'doubleRow',
      [BULK_EDIT_OP_CONSTS.TITLE_DELETE]: 'singleRow'
    }
  },
  description: {
    controls: 'ControlsDescription',
    productRow: 'ProductRowDescription',
    classes: {
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE]: 'descriptionRow',
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER]: 'descriptionRow',
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE]: 'doubleDescriptionRow',
      [BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE]: 'descriptionRow'
    }
  },
  taxonomy: {
    controls: 'ControlsTaxonomy',
    productRow: 'ProductRowTaxonomy'
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
  price: {
    controls: 'ControlsPrice',
    productRow: 'ProductRowPrice',
    classes: {
      [BULK_EDIT_OP_CONSTS.PRICE_INCREASE_BY]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.PRICE_DECREASE_BY]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.PRICE_CHANGE_TO]: 'singleRow'
    }
  },
  quantity: {
    controls: 'ControlsQuantity',
    productRow: 'ProductRowQuantity',
    classes: {
      [BULK_EDIT_OP_CONSTS.QUANTITY_INCREASE_BY]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.QUANTITY_DECRESE_BY]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.QUANTITY_CHANGE_TO]: 'singleRow'
    }
  },
  variations: {
    controls: 'ControlsVariations',
    productRow: 'ProductRowVariations'
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
  materials: {
    controls: 'ControlsMaterials',
    productRow: 'ProductRowMaterials',
    classes: {
      [BULK_EDIT_OP_CONSTS.MATERIALS_ADD]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.MATERIALS_DELETE]: 'singleRow'
    }
  },
  section: {
    controls: 'ControlsSection',
    productRow: 'ProductRowSection',
    classes: {
      [BULK_EDIT_OP_CONSTS.SECTION_SET]: 'singleRow'
    }
  },
  occasion: {
    controls: 'ControlsOccasion',
    productRow: 'ProductRowOccasion',
    classes: {
      [BULK_EDIT_OP_CONSTS.OCCASION_SET]: 'singleRow'
    }
  },
  holiday: {
    controls: 'ControlsHoliday',
    productRow: 'ProductRowHoliday',
    classes: {
      [BULK_EDIT_OP_CONSTS.HOLIDAY_SET]: 'singleRow'
    }
  },
  style: {
    controls: 'ControlsStyle',
    productRow: 'ProductRowStyle',
    classes: {
      [BULK_EDIT_OP_CONSTS.STYLE_SET]: 'singleRow'
    }
  },

  variationsInventory: {
    controls: 'ControlsInventory',
    productRow: 'ProductRowInventory'
  },
  quantityInventory: {
    controls: 'ControlsQuantityInventory',
    productRow: 'ProductRowQuantityInventory',
    staticClasses: 'singleRow'
  },
  priceInventory: {
    controls: 'ControlsPriceInventory',
    productRow: 'ProductRowPriceInventory',
    staticClasses: 'singleRow'
  },
  skuInventory: {
    controls: 'ControlsSkuInventory',
    productRow: 'ProductRowSkuInventory',
    classes: {
      [BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE]: 'doubleRow',
      [BULK_EDIT_OP_CONSTS.SKU_INVENTORY_DELETE]: 'singleRow',
      [BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO]: 'singleRow'
    }
  }
};
