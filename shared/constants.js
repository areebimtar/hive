export const CHANNEL = {
  ETSY: 1,
  SHOPIFY: 2
};

export const CHANNEL_NAMES = {
  [CHANNEL.ETSY]: 'etsy',
  [CHANNEL.SHOPIFY]: 'shopify'
};

export const AUTH = {
  OAUTH_1: 1,
  SHOPIFY_OAUTH_2: 2
};

export const MANAGER = {
  APP_SERVERS_ENDPOINT: 'app-servers',
  WORKERS_ENDPOINT: 'workers',
  TASK_OPERATIONS: {
    ENQUEUE: 'enqueue', // Enqueue task
    GET_SUBTASK_RESULTS: 'getSubtaskResults',
    HAS_WIP_SUBTASKS: 'hasWipSubtasks',
    GET_TASK_START_TIME: 'getTaskStartTime',
    REPORT_QUOTA: 'reportQuota',
    DROP_ALL_COMPLETED_CHILDREN: 'dropAllCompletedChildren',
    CLEAR_MODIFIED_FLAG: 'clearModifiedFlag',
    RESULT: 'result' // Result of task execution
  },
  TASK_RESULTS: {
    SUCCEEDED: 'succeeded',
    FAILED: 'failed'
  }
};

export const WORKER = {
  TASK_OPERATIONS: {
    START: 'start',
    RESUME: 'resume'
  },
  TASK_RESULTS: {
    SUCCEEDED: 'succeeded',
    SUSPENDED: 'suspended',
    FAILED: 'failed',
    ABORTED: 'aborted',
    BLOCKED: 'blocked'
  }
};

export const OPERATIONS = {
  DOWNLOAD_PRODUCT: 'downloadProduct',
  UPLOAD_PRODUCT: 'uploadProduct',
  UPLOAD_PRODUCT_FIELDS: 'uploadProductFields',
  UPLOAD_PRODUCT_OFFERINGS: 'uploadProductOfferings',
  UPLOAD_IMAGE: 'uploadImage',
  REARRANGE_IMAGES: 'rearrangeImages',
  DELETE_IMAGE: 'deleteImage',
  UPDATE_ATTRIBUTE: 'updateAttribute',
  DELETE_ATTRIBUTE: 'deleteAttribute',
  CREATE_SECTION: 'createSection',
  SYNC_SHOP: 'syncShop'
};

export const AMQP = {
  PREFETCH_COUNT: 1,
  INITIAL_TOKEN: 'initial token',
  RECONNECT_RETRIES: 2,
  RECONNECT_DELAY: 1000
};

export const QUEUES = {
  MANAGER_TASKS: 'manager-tasks',
  CHECK_SHOP_SYNC: 'check-shop-sync',
  APPLY_OPERATIONS: 'apply-operations'
};

export const EXCHANGES = {
  APPLY_OPERATIONS: 'apply-operations',
  COMMANDS: 'commands',
  MANAGER_TASKS: 'manager-tasks'
};

// Shop auto sync interval 6 hours
export const SHOP_SYNC_INTERVAL = 6 * 60 * 60 * 1000;
// how long should we wait before retrying next sync shop in case of failure
const SHOP_SYNC_RETRY_PERIOD = 1 * 60 * 60 * 1000;

// Failed shop sync will set timestamp by this amount into the past
export const SHOP_SYNC_RETRY_BUFFER_PERIOD = Math.max(0, SHOP_SYNC_INTERVAL - SHOP_SYNC_RETRY_PERIOD);

export const AWS_SIGN_URL_EXPIRATION_TIMEOUT = 10; // in seconds
