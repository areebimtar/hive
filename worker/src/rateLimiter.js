import moment from 'moment';

export default class RateLimiter {
  constructor(manager, taskId) {
    this._manager = manager;
    this._taskId = taskId;
  }

  getRequestStartDelay() {
    return this._manager.getTaskStartTime(this._taskId)
      .then((startTimestamp) => {
        const now = moment().valueOf();
        const delay = startTimestamp - now;
        console.log(`now: ${now}, start: ${startTimestamp}, delay: ${delay}`);
        return delay > 0 ? delay : 0;
      });
  }

  reportQuota(quotaInfo) {
    this._manager.reportQuota(this._taskId, quotaInfo);
  }
}
