export default class QuotaLimit {
  constructor(defaultDailyQuotaReserved = 0) {
    // eslint-disable-next-line no-undef
    this._customDailyQuotaReserves = new Map();
    this._defaultDailyQuotaReserved = defaultDailyQuotaReserved;
  }

  getReserveForQueue(queue) {
    let reserve;
    if (this._customDailyQuotaReserves.has(queue)) {
      reserve = this._customDailyQuotaReserves.get(queue);
      if (new Date() > reserve.timeout) {
        this._customDailyQuotaReserves.delete(queue);
        reserve = undefined;
      }
    }
    if (!reserve) {
      reserve = {
        reservedQuotaAsPercentage: this._defaultDailyQuotaReserved
      };
    }
    return reserve;
  }

  getReservedNumberOfCallsForQueue(queue) {
    return Math.round(queue.quotaDailyLimit * this.getReserveForQueue(queue).reservedQuotaAsPercentage / 100);
  }

  setReserveForQueue(queue, reservedQuotaAsPercentage, timeoutInMs = 24 * 60 * 60 * 1000) {
    const reserve = {
      reservedQuotaAsPercentage: reservedQuotaAsPercentage,
      timeout: Date.now() + timeoutInMs
    };
    this._customDailyQuotaReserves.set(queue, reserve);

    return reserve;
  }

  checkExhausted(queue) {
    const exhausted = queue.quotaRemaining <= this.getReservedNumberOfCallsForQueue(queue);
    return exhausted;
  }
}
