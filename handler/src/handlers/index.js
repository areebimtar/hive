import { ROLES } from '../constants';

import ShopifySyncShop from './shopifySyncShop';
import ShopifyToAPICall from './shopifyToAPICall';
import ShopifyRateLimit from './shopifyRateLimit';
import ShopifyAPICall from './shopifyAPICall';
import ShopifyDownloadProduct from './shopifyDownloadProduct';
import ShopifyUploadProduct from './shopifyUploadProduct';
import ShopifyAggregate from './shopifyAggregate';
import ShopifyApplyOperations from './shopifyApplyOperations';
import ShopifyApplyOperationsSplitter from './shopifyApplyOperationsSplitter';
import ScheduleShopSync from './scheduleShopSync';
import AssignUniquePrefix from './assignUniquePrefix';

export const HANDLERS = {
  [ROLES.ASSIGN_UNIQUE_PREFIX]: AssignUniquePrefix,
  [ROLES.SHOPIFY_SYNC_SHOP]: ShopifySyncShop,
  [ROLES.SHOPIFY_TO_API_CALL]: ShopifyToAPICall,
  [ROLES.SHOPIFY_RATE_LIMIT]: ShopifyRateLimit,
  [ROLES.SHOPIFY_API_CALL]: ShopifyAPICall,
  [ROLES.SHOPIFY_DOWNLOAD_PRODUCT]: ShopifyDownloadProduct,
  [ROLES.SHOPIFY_UPLOAD_PRODUCT]: ShopifyUploadProduct,
  [ROLES.SHOPIFY_APPLY_OPERATIONS]: ShopifyApplyOperations,
  [ROLES.SHOPIFY_APPLY_OPERATIONS_SPLITTER]: ShopifyApplyOperationsSplitter,
  [ROLES.SHOPIFY_AGGREGATE]: ShopifyAggregate,
  [ROLES.SCHEDULE_SHOP_SYNC]: ScheduleShopSync
};
