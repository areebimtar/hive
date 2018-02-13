import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

chai.use(sinonChai);

import RateLimiter from './rateLimiter';

const MOMENT = {
  valueOf: () => { return 1000; }
};

const momentMock = sinon.spy(() => { return MOMENT; });

const managerMockPast = {
  getTaskStartTime: sinon.spy(() => { return Promise.resolve(MOMENT.valueOf() - 100); })
};

const managerMockNow = {
  getTaskStartTime: sinon.spy(() => { return Promise.resolve(MOMENT.valueOf()); })
};

const managerMockFuture = {
  getTaskStartTime: sinon.spy(() => { return Promise.resolve(MOMENT.valueOf() + 100); })
};

const taskId = 1;

describe('Rate Limiter', () => {
  beforeEach(() => {
    RateLimiter.__Rewire__('moment', momentMock);
  });

  afterEach(() => {
    RateLimiter.__ResetDependency__('moment');
  });

  it('should provide expected interface', () => {
    expect(RateLimiter.prototype.getRequestStartDelay).to.be.a('function');
  });

  it('should return proper delay when returned task start time is in past', (done) => {
    const rl = new RateLimiter(managerMockPast, taskId);
    rl.getRequestStartDelay()
      .then((delay) => {
        expect(delay).to.be.equal(0);
        done();
      })
      .catch(done);
  });

  it('should return proper delay when returned task start time is right now', (done) => {
    const rl = new RateLimiter(managerMockNow, taskId);
    rl.getRequestStartDelay()
      .then((delay) => {
        expect(delay).to.be.equal(0);
        done();
      })
      .catch(done);
  });

  it('should return proper delay when returned task start time is in future', (done) => {
    const rl = new RateLimiter(managerMockFuture, taskId);
    rl.getRequestStartDelay()
      .then((delay) => {
        expect(delay).to.be.equal(100);
        done();
      })
      .catch(done);
  });
});
