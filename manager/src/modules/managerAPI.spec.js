import request from 'supertest';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import ManagerAPI from './managerAPI';

describe('Manager API', () => {
  const queues = [{id: 1, tasks: [ { id: 'dummy task'}]}, {id: 2, tasks: []}];
  const quotaLimit = {id: Math.random()};
  const fakeManager = {
    _pool: {
      getNumIdle() { return 1; },
      getNumBusy() { return 2; }
    },
    _taskQueue: {
      _queues: queues,
      _queueIndex: { 1: queues[0], 2: queues[1]},
      _taskIndex: { 'dummy task': queues[0].tasks[0]},
      _quotaLimit: {
        checkExhausted: queue => queue.id === 1,
        getReserveForQueue: () => (quotaLimit)
      },
      _getQueueById: id => queues[id - 1]
    }
  };

  const managerAPI = new ManagerAPI(fakeManager);
  const app = managerAPI._api;

  it('should return list of queues with number of tasks', (done) => {
    request(app)
      .get('/queues')
      .expect('[{"id":1,"taskCount":1},{"id":2,"taskCount":0}]', done);
  });

  it('should return counters when /stats is requested', (done) => {
    request(app)
      .get('/stats')
      .expect('{"workers":{"numIdle":1,"numBusy":2},"queueCount":2,"queueIndexSize":2,"taskCount":1,"taskIndexSize":1}', done);
  });

  it('should return status of workers when GET /workers is called', (done) => {
    request(app)
      .get('/workers')
      .expect('{"idle":1,"busy":2}', done);
  });

  it('should return list of exhausted queues', (done) => {
    request(app)
      .get('/queues/exhausted')
      .expect('[{"id":1,"taskCount":1}]', done);
  });

  it('should return a specific queue', (done) => {
    request(app)
      .get('/queue/2')
      .expect(JSON.stringify(queues[1]), done);
  });

  it('should return reserved quota of specific queue', (done) => {
    request(app)
      .get('/queue/2/reservedQuota')
      .expect(JSON.stringify(quotaLimit), done);
  });

  it('should set reserved quota of specific queue', (done) => {
    fakeManager._taskQueue._quotaLimit.setReserveForQueue = sinon.spy();
    request(app)
      .post('/queue/2/reservedQuota')
      .send('timeoutInMs=1000')
      .send('reservedQuotaAsPercentage=15')
      .expect(JSON.stringify(quotaLimit), () => {
        expect(fakeManager._taskQueue._quotaLimit.setReserveForQueue).to.have.been.calledWith(queues[1], 15, 1000);
        done();
      });
  });
});
