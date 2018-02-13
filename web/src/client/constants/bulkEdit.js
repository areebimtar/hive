import taxonomy from 'global/modules/etsy/taxonomy.json';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

export const CLOSE_MODAL_CONSTS = {
  CLOSE: 'close',
  SYNC_UPDATES: 'sync updates',
  KEEP_EDITING: 'keep editing'
};

export const DESCRIPTION_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE,
    text: 'Add Before'
  },
  {
    type: BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER,
    text: 'Add After'
  },
  {
    type: BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE,
    text: 'Find & Replace'
  },
  {
    type: BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE,
    text: 'Delete'
  }
];

export const SKU_INVENTORY_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE,
    text: 'Add Before'
  },
  {
    type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER,
    text: 'Add After'
  },
  {
    type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE,
    text: 'Find & Replace'
  },
  {
    type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_DELETE,
    text: 'Delete'
  },
  {
    type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO,
    text: 'Change To'
  }
];

export const STYLE_OPTIONS = [
  'None',
  'Abstract',
  'African',
  'Art Deco',
  'Art Nouveau',
  'Asian',
  'Athletic',
  'Avant Garde',
  'Beach',
  'Boho',
  'Cottage Chic',
  'Country Western',
  'Edwardian',
  'Fantasy',
  'Folk',
  'Goth',
  'High Fashion',
  'Hip Hop',
  'Hippie',
  'Hipster',
  'Historical',
  'Hollywood Regency',
  'Industrial',
  'Kawaii',
  'Kitsch',
  'Mediterranean',
  'Mid Century',
  'Military',
  'Minimalist',
  'Mod',
  'Modern',
  'Nautical',
  'Neoclassical',
  'Preppy',
  'Primitive',
  'Regency',
  'Renaissance',
  'Resort',
  'Retro',
  'Rocker',
  'Rustic',
  'Sci Fi',
  'Southwestern',
  'Spooky',
  'Steampunk',
  'Techie',
  'Traditional',
  'Tribal',
  'Victorian',
  'Waldorf',
  'Woodland',
  'Zen'
];

export const MATERIALS_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.MATERIALS_ADD,
    text: 'Add'
  },
  {
    type: BULK_EDIT_OP_CONSTS.MATERIALS_DELETE,
    text: 'Delete'
  }
];

export const QUANTITY_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.QUANTITY_INCREASE_BY,
    text: 'Increase By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.QUANTITY_DECRESE_BY,
    text: 'Decrease By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.QUANTITY_CHANGE_TO,
    text: 'Change To'
  }
];

export const QUANTITY_INVENTORY_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_INCREASE_BY,
    text: 'Increase By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_DECREASE_BY,
    text: 'Decrease By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_CHANGE_TO,
    text: 'Change To'
  }
];

export const PRICE_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.PRICE_INCREASE_BY,
    text: 'Increase By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.PRICE_DECREASE_BY,
    text: 'Decrease By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.PRICE_CHANGE_TO,
    text: 'Change To'
  }
];


export const PRICE_INVENTORY_OPTIONS = [
  {
    type: BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_INCREASE_BY,
    text: 'Increase By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_DECREASE_BY,
    text: 'Decrease By'
  },
  {
    type: BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_CHANGE_TO,
    text: 'Change To'
  }
];

export const TAXONOMY_MAP = taxonomy;
