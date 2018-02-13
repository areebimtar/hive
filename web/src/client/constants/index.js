import { CHANNEL } from 'global/constants';

export const SHOPS_POLL_INTERVAL_SHORT = 1000;
export const SHOPS_POLL_INTERVAL_LONG = 60 * 1000;

export const APPLY_PROGRESS_MODEL_SHORTEST_DURATION = 1500;

export const SYNC_STATUS_MODAL_TIMEOUT = 20000;

// to add menu feature flag:
//   * add record into MAGIC_SETTINGS map
//     { occasionUI: { key: 'occasionUI', title: 'Occasion UI', enableUi: true }}
//   * add mixin to hive/web/src/client/less/views/content.less
//     .enableAccessMixin(occasion-ui);
export const MAGIC = 'magic';
export const MAGIC_SETTINGS = {
  syncModal: {
    key: 'syncStatusModalSeen',
    title: 'Sync Modal Seen',
    enableUi: false
  }
};

export const CANNOT_EDIT_INVENTORY_MESSAGE = 'Cannot edit inventory for "Retail & Wholesale" listings';
export const CANNOT_EDIT_OCCASION_MESSAGE = 'Cannot edit occasion for "Retail & Wholesale" listings';
export const CANNOT_EDIT_HOLIDAY_MESSAGE = 'Cannot edit holiday for "Retail & Wholesale" listings';
export const CANNOT_EDIT_PHOTOS_MESSAGE = 'Cannot edit listings with more than 10 photos';

export const PAGINATION_OFFSET = 25;
export const PAGINATION_INITIAL_LIMIT = 25;
export const PAGINATION_MAX_LIMIT = 50;

export const THROTTLE_TIMEOUT = 100;
export const SEARCH_THROTTLE_TIMEOUT = 200;

export const SHOPS_DROPDOWN_CHANNEL_ORDER = [CHANNEL.ETSY, CHANNEL.SHOPIFY];
