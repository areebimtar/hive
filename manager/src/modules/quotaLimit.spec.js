import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import QuotaLimit from './quotaLimit';

describe('Quota Limit', () => {
  const quotaLimit = new QuotaLimit(21);

  it('should use the default quota limit for a new queue', () => {
    const queue = {quotaRemaining: 100, quotaDailyLimit: 200};

    const result = quotaLimit.getReserveForQueue(queue);
    expect(result.reservedQuotaAsPercentage).to.equal(21);
  });

  it('should set the quota limit to a custom value', () => {
    const clock = sinon.useFakeTimers();
    const queue = {quotaRemaining: 100, quotaDailyLimit: 200};

    quotaLimit.setReserveForQueue(queue, 11, 1000);
    const result = quotaLimit.getReserveForQueue(queue);
    expect(result.reservedQuotaAsPercentage).to.equal(11);
    expect(result.timeout).to.equal(Date.now() + 1000);

    clock.restore();
  });

  it('should timeout custom quotas', () => {
    const clock = sinon.useFakeTimers();
    const queue = {quotaRemaining: 100, quotaDailyLimit: 200};

    let result = quotaLimit.getReserveForQueue(queue);
    expect(result.reservedQuotaAsPercentage).to.equal(21);

    quotaLimit.setReserveForQueue(queue, 11, 1000);

    result = quotaLimit.getReserveForQueue(queue);
    expect(result.reservedQuotaAsPercentage).to.equal(11);

    clock.tick(1001);

    result = quotaLimit.getReserveForQueue(queue);
    expect(result.reservedQuotaAsPercentage).to.equal(21);

    clock.restore();
  });

  it('should correctly check whether queue exhausted', () => {
    const queue = {quotaRemaining: 10, quotaDailyLimit: 200};

    let result = quotaLimit.checkExhausted(queue);
    expect(result).to.equal(true);

    quotaLimit.setReserveForQueue(queue, 1, 1000);

    result = quotaLimit.checkExhausted(queue);
    expect(result).to.equal(false);
  });
});
