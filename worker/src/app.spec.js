import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

chai.use(sinonChai);

import App from './app';
// import { WORKER } from 'global/constants'; // TODO: Uncomment this when babel6 issue will be solved
import { WORKER } from '../../shared/constants';

const loggerMock = {
  info: () => {},
  debug: () => {},
  error: () => {}
};

const RateLimiter = {

};

const RateLimiterMock = sinon.spy(() => { return RateLimiter; });

const configMock = {};

let operationHandlers;

describe('Worker app', () => {
  beforeEach(() => {
    const handlers = {
      testOk: { start: sinon.spy(() => { return Promise.resolve({result: 'succeeded'}); })},
      testFail: { start: sinon.spy(() => { return Promise.resolve({ result: 'failed'}); })},
      testThrow: { start: () => { throw new Error('Boom'); }},
      testReject: { start: () => { return Promise.reject(new Error('Boom')); }}
    };

    operationHandlers = handlers;

    App.__Rewire__('operationHandlers', operationHandlers);
    App.__Rewire__('RateLimiter', RateLimiterMock);
  });

  afterEach(() => {
    App.__ResetDependency__('operationHandlers');
    App.__ResetDependency__('RateLimiter');
  });

  it('should provide expected interface', () => {
    expect(App.prototype.init).to.be.a('function');
    // expect(DbMock.none).to.have.been.calledWithExactly(QUERY, VALUES);
  });

  it('should construct object properly', () => {
    const DbMock = {};
    const ModelsMock = sinon.spy(() => {});
    const managerMock = {
      onStartTask: sinon.spy(() => {}),
      onResumeTask: sinon.spy(() => {})
    };
    const app = new App(DbMock, ModelsMock, {}, managerMock, loggerMock); // eslint-disable-line no-unused-vars
    expect(ModelsMock).to.have.been.calledWithExactly(DbMock);
    expect(managerMock.onStartTask).to.have.been.called;
    expect(managerMock.onStartTask.args[0][0]).to.be.a.function;
  });

  it('should report unknown operation properly', () => {
    const managerMock = {
      onStartTask: (handler) => { managerMock._startHandler = handler; },
      onResumeTask: () => {},
      taskResult: sinon.spy(() => {})
    };

    const task = {
      id: 'TASK_ID',
      operation: 'OPERATION',
      operationData: 'OPERATION_DATA'
    };

    const app = new App({}, () => {}, {}, managerMock, loggerMock); // eslint-disable-line no-unused-vars
    managerMock._startHandler(task);
    const requests = { requestsMade: 0 };
    expect(managerMock.taskResult).to.have.been.calledWithExactly(task.id, requests, WORKER.TASK_RESULTS.FAILED, `Unknown operation: ${task.operation}`);
  });

  it('should execute proper operation handler with proper parameters, and properly handle successful result', (done) => {
    const managerMock = {
      onStartTask: (handler) => { managerMock._startHandler = handler; },
      onResumeTask: () => {},
      taskResult: sinon.spy(() => { })
    };

    const task = {
      id: 'TASK_ID',
      operation: 'testOk',
      operationData: 'OPERATION_DATA'
    };

    const app = new App({}, () => {}, configMock, managerMock, loggerMock);
    managerMock._startHandler(task);
    const requests = { requestsMade: 0 };
    setImmediate(() => {
      expect(operationHandlers.testOk.start).to.have.been.calledWithExactly(configMock, app._models, loggerMock, task.operationData, task.id, app._manager, requests, RateLimiter);
      expect(managerMock.taskResult).to.have.been.calledWithExactly(task.id, requests, WORKER.TASK_RESULTS.SUCCEEDED, undefined);
      done();
    });
  });

  it('should properly handle failed operation handler', (done) => {
    const managerMock = {
      onStartTask: (handler) => { managerMock._startHandler = handler; },
      onResumeTask: () => {},
      taskResult: sinon.spy(() => { })
    };

    const task = {
      id: 'TASK_ID',
      operation: 'testFail',
      operationData: 'OPERATION_DATA'
    };

    const app = new App({}, () => {}, configMock, managerMock, loggerMock);
    managerMock._startHandler(task);
    const requests = { requestsMade: 0 };
    setImmediate(() => {
      expect(operationHandlers.testFail.start).to.have.been.calledWithExactly(configMock, app._models, loggerMock, task.operationData, task.id, app._manager, requests, RateLimiter);
      expect(managerMock.taskResult).to.have.been.calledWithExactly(task.id, requests, WORKER.TASK_RESULTS.FAILED, 'Operation handler has returned unknown result');
      done();
    });
  });

  it('should properly handle exception from operation handler', (done) => {
    const managerMock = {
      onStartTask: (handler) => { managerMock._startHandler = handler; },
      onResumeTask: () => {},
      taskResult: sinon.spy(() => { })
    };

    const task = {
      id: 'TASK_ID',
      operation: 'testThrow'
    };

    const app = new App({}, () => {}, {}, managerMock, loggerMock); // eslint-disable-line no-unused-vars
    managerMock._startHandler(task);
    const requests = { requestsMade: 0 };
    setImmediate(() => {
      expect(managerMock.taskResult).to.have.been.calledWithExactly(task.id, requests, WORKER.TASK_RESULTS.FAILED, 'Boom');
      done();
    });
  });

  it('should properly handle rejection from operation handler', (done) => {
    const managerMock = {
      onStartTask: (handler) => { managerMock._startHandler = handler; },
      onResumeTask: () => {},
      taskResult: sinon.spy(() => { })
    };

    const task = {
      id: 'TASK_ID',
      operation: 'testReject'
    };

    const app = new App({}, () => {}, {}, managerMock, loggerMock); // eslint-disable-line no-unused-vars
    managerMock._startHandler(task);
    const requests = { requestsMade: 0 };
    setImmediate(() => {
      expect(managerMock.taskResult).to.have.been.calledWithExactly(task.id, requests, WORKER.TASK_RESULTS.FAILED, 'Boom');
      done();
    });
  });
});
