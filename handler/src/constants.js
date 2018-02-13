export const CHANNEL_NAME = 'shopify';

// roles as they appear in config.json
export const ROLES = {
  ASSIGN_UNIQUE_PREFIX: 'assignUniquePrefix',
  SHOPIFY_SYNC_SHOP: 'shopifySyncShop',
  SHOPIFY_TO_API_CALL: 'shopifyToAPICall',
  SHOPIFY_RATE_LIMIT: 'shopifyRateLimit',
  SHOPIFY_API_CALL: 'shopifyAPICall',
  SHOPIFY_DOWNLOAD_PRODUCT: 'shopifyDownloadProduct',
  SHOPIFY_UPLOAD_PRODUCT: 'shopifyUploadProduct',
  SHOPIFY_APPLY_OPERATIONS: 'shopifyApplyOperations',
  SHOPIFY_APPLY_OPERATIONS_SPLITTER: 'shopifyApplyOperationsSplitter',
  SHOPIFY_AGGREGATE: 'shopifyAggregate',
  SCHEDULE_SHOP_SYNC: 'scheduleShopSync'
};

// queues where handlers are subrscribed to
export const QUEUES = {
  COMMANDS: 'commands',
  SHOPIFY_SYNC_SHOP: '${prefix}.shopify-syncShop',
  SHOPIFY_DOWNLOAD_PRODUCT: '${prefix}.shopify-download-product',
  SHOPIFY_UPLOAD_PRODUCT: '${prefix}.shopify-upload-product',
  SHOPIFY_APPLY_OPERATIONS: '${prefix}.shopify-apply-operations',
  SHOPIFY_APPLY_OPERATIONS_SPLITTER: '${prefix}.shopify-apply-operations-splitter',
  SHOPIFY_RETRY_WAIT: '${prefix}.shopify-retry-wait',
  SHOPIFY_TO_API_CALL: '${prefix}.shopify-to-api-call',
  SHOPIFY_API_CALLS: '${prefix}.shopify-api-calls',
  SHOPIFY_API_CALLS_WAIT: '${prefix}.shopify-api-calls-wait',
  SHOPIFY_SLOW_STREAM_API_CALLS: '${prefix}.shopify-slow-stream-api-calls',
  SHOPIFY_API_RESPONSES_TIMES: '${prefix}.shopify-api-responses-times',
  SHOPIFY_AGGREGATE: '${prefix}.shopify-aggregate',
  SCHEDULE_SHOP_SYNC: '${prefix}.schedule-shop-sync'
};

// exchanges where handlers will push into
export const EXCHANGES = {
  COMMANDS: 'commands',
  UNIQUE_PREFIX_ROUTER: 'unique-prefix-router',
  CHANNEL_ROUTER: '${prefix}.channel-router',
  CHANNEL_SHOPIFY_ROUTER: '${prefix}.channel-shopify-router',
  SHOPIFY_RETRY_WAIT: '${prefix}.shopify-retry-wait',
  SHOPIFY_TO_API_CALL: '${prefix}.shopify-to-api-call',
  SHOPIFY_API_CALLS: '${prefix}.shopify-api-calls',
  SHOPIFY_API_CALLS_WAIT: '${prefix}.shopify-api-calls-wait',
  SHOPIFY_SLOW_STREAM_API_CALLS: '${prefix}.shopify-slow-stream-api-calls',
  SHOPIFY_API_CALLS_RESPONSE: '${prefix}.shopify-api-calls-response',
  SHOPIFY_AGGREGATE: '${prefix}.shopify-aggregate',
  SCHEDULE_SHOP_SYNC: 'schedule-shop-sync',
  SHOPIFY_CHECK_SHOP_SYNC_WAIT: 'schedule-shop-sync-wait'
};

export const ROLES_TO_QUEUE_MAP = {
  [ROLES.ASSIGN_UNIQUE_PREFIX]: [QUEUES.COMMANDS],
  [ROLES.SHOPIFY_SYNC_SHOP]: [QUEUES.SHOPIFY_SYNC_SHOP],
  [ROLES.SHOPIFY_DOWNLOAD_PRODUCT]: [QUEUES.SHOPIFY_DOWNLOAD_PRODUCT],
  [ROLES.SHOPIFY_UPLOAD_PRODUCT]: [QUEUES.SHOPIFY_UPLOAD_PRODUCT],
  [ROLES.SHOPIFY_APPLY_OPERATIONS]: [QUEUES.SHOPIFY_APPLY_OPERATIONS],
  [ROLES.SHOPIFY_APPLY_OPERATIONS_SPLITTER]: [QUEUES.SHOPIFY_APPLY_OPERATIONS_SPLITTER],
  [ROLES.SHOPIFY_TO_API_CALL]: [QUEUES.SHOPIFY_TO_API_CALL],
  [ROLES.SHOPIFY_RATE_LIMIT]: [QUEUES.SHOPIFY_API_CALLS, QUEUES.SHOPIFY_API_RESPONSES_TIMES],
  [ROLES.SHOPIFY_API_CALL]: [QUEUES.SHOPIFY_SLOW_STREAM_API_CALLS],
  [ROLES.SHOPIFY_AGGREGATE]: [QUEUES.SHOPIFY_AGGREGATE],
  [ROLES.SCHEDULE_SHOP_SYNC]: [QUEUES.SCHEDULE_SHOP_SYNC]
};

export const MESSAGE_TYPE = {
  SHOPIFY: {
    SYNC_SHOP: {
      COMMAND: 'shopify.syncShop',
      SHOP_INFO: 'shopify.syncShop.shopInfo',
      COUNT: 'shopify.syncShop.count',
      GET_PRODUCTS: 'shopify.syncShop.getProducts',
      GET_PRODUCTS_COMPLETED: 'shopify.syncShop.getProducts.subtasksCompleted',
      SUBTASKS_COMPLETED: 'shopify.syncShop.subtasksCompleted',
      ERROR: 'shopify.syncShop.error'
    },
    DOWNLOAD_PRODUCT: {
      COMMAND: 'shopify.downloadProduct',
      API_CALL: 'shopify.downloadProduct.APICall',
      API_CALL_ERROR: 'shopify.downloadProduct.APICall.error',
      ERROR: 'shopify.downloadProduct.error'
    },
    UPLOAD_PRODUCT: {
      COMMAND: 'shopify.uploadProduct',
      API_CALL: 'shopify.uploadProduct.APICall',
      API_CALL_ERROR: 'shopify.uploadProduct.APICall.error',
      ERROR: 'shopify.uploadProduct.error'
    },
    APPLY_OPERATIONS: {
      COMMAND: 'shopify.applyOperations',
      SUBTASKS_COMPLETED: 'shopify.applyOperations.subtasksCompleted'
    },
    APPLY_OPERATIONS_SPLITTER: {
      COMMAND: 'shopify.applyOperationsSplitter',
      SUBTASKS_COMPLETED: 'shopify.applyOperationsSplitter.subtasksCompleted'
    }
  },
  AGGREGATOR: '',
  SUBTASKS_COMPLETED: 'subtasksCompleted',
  ERROR: 'error'
};

export const STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  NACK: 'nack'
};
