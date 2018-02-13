export const TASK = {
  STATE: {
    FREE: undefined,
    STARTED: 'started',
    RESUMED: 'resumed',
    FAILED: 'failed',
    DONE: 'done',
    SUSPENDED: 'suspended',
    ABORTED: 'aborted'
  },
  STATE_TTL: {
    STARTED: 10 * 60 * 1000 // 10 minutes
  }
};
