import _ from 'lodash';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import { MANAGER, WORKER, OPERATIONS } from '../../shared/constants';

chai.use(sinonChai);

import App from './app';

const workerSpy = {
  constructor: sinon.spy(() => {}),
  start: sinon.spy(() => { }),
  onTaskResult: sinon.spy(() => {}),
  terminate: sinon.spy(() => {})
};

const TestTask1 = {
  id: 1234,
  retry: 0,
  companyId: 2,
  channelId: 1,
  operation: 'foo',
  operationData: '123'
};

const LoggerMock = {
  info: () => { },
  debug: () => { },
  error: () => { }
};

const SocketMock = {
  _handlers: {},
  _emit: (signal, data, callback) => {
    const handler = SocketMock._handlers[signal];
    handler(data, callback);
  },
  on: sinon.spy((signal, handler) => { SocketMock._handlers[signal] = handler; })
};

const ModelsMock = () => {
  return {};
};

const workerPoolSpy = {
  constructor: sinon.spy(() => {}),
  add: sinon.spy(() => { }),
  getNumIdle: sinon.spy(() => { return workerPoolSpy._numIdle; }),
  borrow: sinon.spy(() => { return workerPoolSpy._idleWorker; }),
  return: sinon.spy(() => {}),
  _idleWorker: undefined,
  _numIdle: 0
};

const TIMED_OUT_TASKS = [];
const TASKS_QUEUE = [];
const TASK_BY_ID = {};

const tasksQueueSpy = {
  constructor: sinon.spy(() => {}),
  init: sinon.spy(() => { return Promise.resolve(); }),
  enqueue: sinon.spy(() => { return Promise.resolve(); }),
  getTask: sinon.spy(() => { return TASKS_QUEUE.shift(); }),
  getTaskById: sinon.spy((id) => { return TASK_BY_ID[id]; }),
  startTask: sinon.spy(() => { return Promise.resolve(); }),
  finishTask: sinon.spy(() => { return Promise.resolve(); }),
  abortTask: sinon.spy(() => { return Promise.resolve(); }),
  pauseTask: sinon.spy(() => { return Promise.resolve(); }),
  retryTask: sinon.spy(() => { return Promise.resolve(); }),
  getAllWipChildren: sinon.spy(() => { return []; }),
  getFailedChildren: sinon.spy(() => { return []; }),
  getAllChildrenResults: sinon.spy(() => { return []; }),
  dropAllCompletedChildren: sinon.spy(() => {}),
  getTaskStartTime: sinon.spy(() => { return {valueOf: () => { return 0; }}; }),
  getTimedOutTasks: sinon.spy(() => {
    const res = _.cloneDeep(TIMED_OUT_TASKS);
    TIMED_OUT_TASKS.splice(0);
    return res;
  })
};

const EtsyMock = {
  ID: 1,
  FIELD: 'VALUE'
};

const configMock = {
  manager: {
    dailyQuotaReserve: 20,
    rateLimitPerSecond: 1,
    APIPort: 1235
  },
  rabbitmq: { mock: true }
};

function emitEnqueue(data) {
  return new Promise((resolve, reject) => {
    SocketMock._emit(MANAGER.TASK_OPERATIONS.ENQUEUE, data, (res) => {
      if (res.result === MANAGER.TASK_RESULTS.SUCCEEDED) {
        resolve();
      } else {
        reject(res);
      }
    });
  });
}

function emitGetTaskStartTime(data) {
  return new Promise((resolve, reject) => {
    SocketMock._emit(MANAGER.TASK_OPERATIONS.GET_TASK_START_TIME, data, (res) => {
      if (res.result === MANAGER.TASK_RESULTS.SUCCEEDED) {
        resolve(res.data);
      } else {
        reject(res);
      }
    });
  });
}


function emitGetSubtaskResults(data) {
  return new Promise((resolve, reject) => {
    SocketMock._emit(MANAGER.TASK_OPERATIONS.GET_SUBTASK_RESULTS, data, (res) => {
      if (res.result === MANAGER.TASK_RESULTS.SUCCEEDED) {
        resolve(res.data);
      } else {
        reject(res);
      }
    });
  });
}

function emitDropAllCompletedChildren(data) {
  return new Promise((resolve, reject) => {
    SocketMock._emit(MANAGER.TASK_OPERATIONS.DROP_ALL_COMPLETED_CHILDREN, data, (res) => {
      if (res.result === MANAGER.TASK_RESULTS.SUCCEEDED) {
        resolve(res.data);
      } else {
        reject(res);
      }
    });
  });
}


describe('Manager app', () => {
  beforeEach(() => {
    TASK_BY_ID = {};
    class WorkerMock {
      constructor() { workerSpy.constructor.apply(this, arguments); }
      start() { return workerSpy.start.apply(this, arguments); }
      onTaskResult() { return workerSpy.onTaskResult.apply(this, arguments); }
      terminate() { return workerSpy.terminate.apply(this, arguments); }
    }
    workerSpy.constructor.reset();
    workerSpy.start.reset();
    workerSpy.onTaskResult.reset();
    workerSpy.terminate.reset();

    class TasksQueueMock {
      constructor() {
        tasksQueueSpy.constructor.apply(this, arguments);
      }

      init() { return tasksQueueSpy.init.apply(this, arguments); }
      enqueue() { return tasksQueueSpy.enqueue.apply(this, arguments); }
      retryTask() { return tasksQueueSpy.retryTask.apply(this, arguments); }
      getTask() { return tasksQueueSpy.getTask.apply(this, arguments); }
      getTaskById() { return tasksQueueSpy.getTaskById.apply(this, arguments); }
      startTask() { return tasksQueueSpy.startTask.apply(this, arguments); }
      finishTask() { return tasksQueueSpy.finishTask.apply(this, arguments); }
      abortTask() { return tasksQueueSpy.abortTask.apply(this, arguments); }
      pauseTask() { return tasksQueueSpy.pauseTask.apply(this, arguments); }
      getAllWipChildren() { return tasksQueueSpy.getAllWipChildren.apply(this, arguments); }
      getFailedChildren() { return tasksQueueSpy.getFailedChildren.apply(this, arguments); }
      getAllChildrenResults() { return tasksQueueSpy.getAllChildrenResults.apply(this, arguments); }
      dropAllCompletedChildren() { return tasksQueueSpy.dropAllCompletedChildren.apply(this, arguments); }
      getTimedOutTasks() { return tasksQueueSpy.getTimedOutTasks.apply(this, arguments); }
      getTaskStartTime() { return tasksQueueSpy.getTaskStartTime.apply(this, arguments); }
    }
    tasksQueueSpy.constructor.reset();
    tasksQueueSpy.init.reset();
    tasksQueueSpy.enqueue.reset();
    tasksQueueSpy.retryTask.reset();
    tasksQueueSpy.getTask.reset();
    tasksQueueSpy.getTaskById.reset();
    tasksQueueSpy.startTask.reset();
    tasksQueueSpy.finishTask.reset();
    tasksQueueSpy.abortTask.reset();
    tasksQueueSpy.pauseTask.reset();
    tasksQueueSpy.getAllWipChildren.reset();
    tasksQueueSpy.getFailedChildren.reset();
    tasksQueueSpy.getAllChildrenResults.reset();
    tasksQueueSpy.dropAllCompletedChildren.reset();
    tasksQueueSpy.getTimedOutTasks.reset();
    tasksQueueSpy.getTaskStartTime.reset();
    TestTask1.retry = 0;

    class WorkerPoolMock {
      constructor() { workerPoolSpy.constructor.apply(this, arguments); }
      add() { return workerPoolSpy.add.apply(this, arguments); }
      getNumIdle() { return workerPoolSpy.getNumIdle.apply(this, arguments); }
      borrow() { return workerPoolSpy.borrow.apply(this, arguments); }
      return() { return workerPoolSpy.return.apply(this, arguments); }
    }
    workerPoolSpy.constructor.reset();
    workerPoolSpy.add.reset();
    workerPoolSpy.getNumIdle.reset();
    workerPoolSpy.borrow.reset();
    workerPoolSpy.return.reset();

    App.__Rewire__('Etsy', EtsyMock);
    App.__Rewire__('Worker', WorkerMock);
    App.__Rewire__('TasksQueue', TasksQueueMock);
    App.__Rewire__('WorkerPool', WorkerPoolMock);
  });

  afterEach(() => {
    App.__ResetDependency__('Etsy');
    App.__ResetDependency__('Worker');
    App.__ResetDependency__('TasksQueue');
    App.__ResetDependency__('WorkerPool');
  });

  it('should provide expected interface', () => {
    expect(App.prototype.init).to.be.a('function');
    expect(App.prototype.registerWorker).to.be.a('function');
    expect(App.prototype.registerAppServer).to.be.a('function');
    // expect(DbMock.none).to.have.been.calledWithExactly(QUERY, VALUES);
  });

  it('should instantiate object properly', () => {
    const dbMock = {};
    const app = new App(dbMock, ModelsMock, configMock, LoggerMock); // eslint-disable-line no-unused-vars
    expect(workerPoolSpy.constructor).to.have.been.calledWithExactly(LoggerMock);
    expect(tasksQueueSpy.constructor).to.have.been.calledWithExactly(dbMock, configMock, LoggerMock); // TODO: Logger is passed temporary
  });

  it('should properly register new worker', () => {
    const dbMock = {};
    const app = new App(dbMock, ModelsMock, configMock, LoggerMock);
    app.registerWorker(SocketMock);
    expect(SocketMock.on).to.have.been.calledWith(MANAGER.TASK_OPERATIONS.ENQUEUE);
    expect(SocketMock.on).to.have.been.calledWith(MANAGER.TASK_OPERATIONS.GET_SUBTASK_RESULTS);
    expect(workerSpy.constructor).to.have.been.calledWithExactly(SocketMock, LoggerMock); // TODO: Logger is passed temporary
    const workerInstance = workerSpy.constructor.thisValues[0]; // Worker object created inside of app
    expect(workerPoolSpy.add).to.have.been.calledWithExactly(workerInstance);
  });

  it('should enqueue task', (done) => {
    const dbMock = {};
    App.CHECK_INTERVAL = 1;
    const app = new App(dbMock, ModelsMock, configMock, LoggerMock);
    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    app.registerWorker(SocketMock);
    emitEnqueue(data)
      .then(() => {
        expect(tasksQueueSpy.enqueue).to.have.been.calledWithExactly(data.companyId, data.channelId, data.operation, data.operationData, data.parentTaskId, 0);
      })
      .done(done);
  });

  it('should successfully enqueue SYNC_SHOP task', (done) => {
    const Models = () => {
      return { shops: { getById: sinon.stub().returns(Promise.resolve({ some: 'data' })) } };
    };
    const dbMock = {};
    App.CHECK_INTERVAL = 1;
    const app = new App(dbMock, Models, configMock, LoggerMock);
    const data = { companyId: 2, channelId: 1, operation: OPERATIONS.SYNC_SHOP, operationData: '123' };
    app.registerWorker(SocketMock);
    emitEnqueue(data)
      .then(() => {
        expect(tasksQueueSpy.enqueue).to.have.been.calledWithExactly(data.companyId, data.channelId, data.operation, data.operationData, data.parentTaskId, 0);
      })
      .done(done);
  });

  it('should fail enqueue SYNC_SHOP task for duplicite shops', (done) => {
    const Models = () => {
      return { shops: { getById: sinon.stub().returns(Promise.resolve({ id: '123', invalid: true, error: 'test error' })) } };
    };
    const dbMock = {};
    App.CHECK_INTERVAL = 1;
    const app = new App(dbMock, Models, configMock, LoggerMock);
    const data = { companyId: 2, channelId: 1, operation: OPERATIONS.SYNC_SHOP, operationData: '123' };
    app.registerWorker(SocketMock);
    emitEnqueue(data)
      .then(() => {
        expect(true).to.be.false;
      })
      .catch(e => {
        expect(e).to.eql({
          result: 'failed',
          cause: 'Cannot enqueue shop 123. Shop is marked as invalid: test error'
        });
      })
      .done(done);
  });

  it('should reject task with missing parent', (done) => {
    const dbMock = {};
    App.CHECK_INTERVAL = 1;
    const app = new App(dbMock, ModelsMock, configMock, LoggerMock);
    const data = { parentTaskId: 1, companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    app.registerWorker(SocketMock);

    emitEnqueue(data)
      .then(() => {
        return new Error('Unexpected success');
      })
      .catch((e) => {
        const expectedResult = {
          result: 'failed',
          cause: `Parent task #${data.parentTaskId} doesn't exist`
        };

        expect(e).to.be.deep.equal(expectedResult);
      })
      .done(done);
  });

  it('should reject task with incorrect parent task id', (done) => {
    const dbMock = {};
    App.CHECK_INTERVAL = 1;
    const app = new App(dbMock, ModelsMock, configMock, LoggerMock);
    const data = { parentTaskId: 'abc', companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    app.registerWorker(SocketMock);

    emitEnqueue(data)
      .then(() => {
        return new Error('Unexpected success');
      })
      .catch((e) => {
        const expectedResult = {
          result: 'failed',
          cause: 'Parent task ID is not a number: abc'
        };

        expect(e).to.be.deep.equal(expectedResult);
      })
      .done(done);
  });

  function prepareApp() {
    const dbMock = {};
    App.CHECK_INTERVAL = 1;
    const app = new App(dbMock, ModelsMock, configMock, LoggerMock);

    // disable loops
    app._scheduleNextTick = () => {};
    app._scheduleShopSync = () => {};

    TestTask1.retry = 0;

    // Push task to 'queue'
    TASKS_QUEUE.push(TestTask1);
    TASK_BY_ID[TestTask1.id] = TestTask1;

    // Register worker
    app.registerWorker(SocketMock);
    workerPoolSpy._numIdle = 1;
    workerPoolSpy._idleWorker = workerSpy.constructor.thisValues[0]; // Worker object created inside of app

    return app;
  }

  it('should run enqueued task', (done) => {
    const app = prepareApp();

    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.getTimedOutTasks).to.have.been.called;

        expect(workerPoolSpy.getNumIdle).to.have.been.called;
        expect(tasksQueueSpy.getTask).to.have.been.called;
        expect(workerPoolSpy.borrow).to.have.been.called;
        expect(workerSpy.onTaskResult).to.have.been.called;

        expect(tasksQueueSpy.startTask).to.have.been.calledWithExactly(TestTask1.id, App.TASK_EXECUTION_TIMEOUT);

        expect(tasksQueueSpy.getTaskById).to.have.been.calledWithExactly(TestTask1.id);
        expect(workerSpy.start).to.have.been.calledWithExactly(TestTask1);
        expect(app._assignedWorkers[TestTask1.id]).to.be.equal(workerPoolSpy._idleWorker);
      })
      .done(done);
  });


  it('should forcibly retry timed out task', (done) => {
    const app = prepareApp();

    const data = { id: 1234, companyId: 2, channelId: 1, operation: 'foo', operationData: '123', retry: 0 };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.getTimedOutTasks).to.have.been.called;

        expect(workerPoolSpy.getNumIdle).to.have.been.called;
        expect(tasksQueueSpy.getTask).to.have.been.called;
        expect(workerPoolSpy.borrow).to.have.been.called;
        expect(workerSpy.onTaskResult).to.have.been.called;

        expect(tasksQueueSpy.startTask).to.have.been.calledWithExactly(TestTask1.id, App.TASK_EXECUTION_TIMEOUT);

        expect(tasksQueueSpy.getTaskById).to.have.been.calledWithExactly(TestTask1.id);
        expect(workerSpy.start).to.have.been.calledWithExactly(TestTask1);
        expect(app._assignedWorkers[TestTask1.id]).to.be.equal(workerPoolSpy._idleWorker);
        TIMED_OUT_TASKS.push(data);
      })
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.getTimedOutTasks).to.have.been.called;
        expect(tasksQueueSpy.retryTask).to.have.been.calledWithExactly(1234, 'Timed out');
        expect(workerSpy.terminate).to.have.been.called;
      })
      .done(done);
  });

  it('should forcibly fail timed out task', (done) => {
    const app = prepareApp();
    TASKS_QUEUE.shift();

    const data = { id: 1234, companyId: 2, channelId: 1, operation: 'foo', operationData: '123', retry: App.MAX_RETRY_COUNT };
    TIMED_OUT_TASKS.push(data);
    TASK_BY_ID[data.id] = data;
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.getTimedOutTasks).to.have.been.called;
        expect(tasksQueueSpy.finishTask).to.have.been.calledWithExactly(1234, 'Timed out', false, false);
        expect(workerSpy.terminate).to.have.not.been.called; // Task was not in assigned tasks

        expect(workerPoolSpy.getNumIdle).to.have.been.called;
        expect(tasksQueueSpy.getTask).to.have.been.called;
        expect(workerPoolSpy.borrow).to.have.not.been.called;

        expect(tasksQueueSpy.startTask).to.have.not.been.called;
      })
      .done(done);
  });

  it('should return worker back to pool when worker is done', (done) => {
    const app = prepareApp();

    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        const taskResultHandler = workerSpy.onTaskResult.args[0][0];
        taskResultHandler({taskId: 123, result: WORKER.TASK_RESULTS.SUCCEEDED});
        expect(workerPoolSpy.return).to.have.been.calledWithExactly(workerSpy.constructor.thisValues[0]);
      })
      .done(done);
  });

  it('should properly handle successfully finished task', (done) => {
    const app = prepareApp();

    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        const taskResultHandler = workerSpy.onTaskResult.args[0][0];
        taskResultHandler({taskId: TestTask1.id, result: WORKER.TASK_RESULTS.SUCCEEDED});
        expect(tasksQueueSpy.finishTask).to.have.been.calledWithExactly(TestTask1.id, undefined, true);
      })
      .done(done);
  });

  it('should properly handle aborted task', (done) => {
    const app = prepareApp();

    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        const taskResultHandler = workerSpy.onTaskResult.args[0][0];
        taskResultHandler({taskId: TestTask1.id, result: WORKER.TASK_RESULTS.ABORTED});
        expect(tasksQueueSpy.abortTask).to.have.been.calledWithExactly(TestTask1.id, undefined);
      })
      .done(done);
  });

  it('should properly handle failed task', (done) => {
    const app = prepareApp();

    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    const FAIL_REASON = 'fail reason';
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.enqueue).to.have.been.calledWithExactly(data.companyId, data.channelId, data.operation, data.operationData, data.parentTaskId, 0);
        tasksQueueSpy.enqueue.reset();

        expect(tasksQueueSpy.startTask).to.have.been.calledWithExactly(TestTask1.id, App.TASK_EXECUTION_TIMEOUT);
        const taskResultHandler = workerSpy.onTaskResult.args[0][0];
        taskResultHandler({taskId: TestTask1.id, result: WORKER.TASK_RESULTS.FAILED, data: FAIL_REASON});
      })
      .delay(10)
      .then(() => {
        expect(tasksQueueSpy.retryTask).to.have.been.calledWithExactly(TestTask1.id, FAIL_REASON);
      })
      .done(done);
  });

  it('should not reschedule failed task when all retries are exhausted', (done) => {
    const app = prepareApp();
    App.MAX_RETRY_COUNT = 0;
    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.enqueue).to.have.been.calledWithExactly(data.companyId, data.channelId, data.operation, data.operationData, data.parentTaskId, 0);
        tasksQueueSpy.enqueue.reset();

        expect(tasksQueueSpy.startTask).to.have.been.calledWithExactly(TestTask1.id, App.TASK_EXECUTION_TIMEOUT);
        const taskResultHandler = workerSpy.onTaskResult.args[0][0];
        taskResultHandler({taskId: TestTask1.id, result: WORKER.TASK_RESULTS.FAILED});
      })
      .delay(10)
      .then(() => {
        expect(tasksQueueSpy.finishTask).to.have.been.calledWithExactly(TestTask1.id, undefined, false, false);
        expect(tasksQueueSpy.enqueue).to.have.not.been.called;
      })
      .done(done);
  });

  it('should properly handle suspended task', (done) => {
    const app = prepareApp();
    const data = { companyId: 2, channelId: 1, operation: 'foo', operationData: '123' };
    emitEnqueue(data)
      .then(app._runTasks.bind(app))
      .then(() => {
        expect(tasksQueueSpy.enqueue).to.have.been.calledWithExactly(data.companyId, data.channelId, data.operation, data.operationData, data.parentTaskId, 0);

        const SUSPENSION_POINT = 'abcd';
        expect(tasksQueueSpy.startTask).to.have.been.calledWithExactly(TestTask1.id, App.TASK_EXECUTION_TIMEOUT);
        const taskResultHandler = workerSpy.onTaskResult.args[0][0];
        taskResultHandler({taskId: TestTask1.id, result: WORKER.TASK_RESULTS.SUSPENDED, data: SUSPENSION_POINT});
        expect(tasksQueueSpy.pauseTask).to.have.been.calledWithExactly(TestTask1.id, SUSPENSION_POINT, App.TASK_SUSPENSION_TIMEOUT);
      })
      .done(done);
  });

  it('should properly handle getSubtaskResults', (done) => {
    const app = prepareApp(); // eslint-disable-line no-unused-vars
    const taskId = 123;
    const orig = tasksQueueSpy.getAllChildrenResults;
    const expectedResult = [
      {id: 1, result: true},
      {id: 2, result: false},
      {id: 3, result: true}
    ];
    tasksQueueSpy.getAllChildrenResults = sinon.spy(() => { return expectedResult; });

    emitGetSubtaskResults({taskId})
      .then((result) => {
        expect(tasksQueueSpy.getAllChildrenResults).to.have.been.calledWithExactly(taskId);
        expect(result).to.be.deep.equal(expectedResult);
      })
      .done(() => {
        tasksQueueSpy.getAllChildrenResults = orig;
        done();
      });
  });

  it('should properly handle exception from getSubtaskResults', (done) => {
    const app = prepareApp(); // eslint-disable-line no-unused-vars
    const taskId = 'Incorrect task ID';

    emitGetSubtaskResults({taskId})
      .then(() => {
        expect(true).to.be.false; // should fail
      })
      .catch((e) => {
        expect(e.cause).to.be.equal(`Task ID is not a number: ${taskId}`);
        expect(tasksQueueSpy.getAllChildrenResults).to.have.not.been.called;
      })
      .done(done);
  });

  it('should properly handle exception from dropAllCompletedChildren', (done) => {
    const app = prepareApp(); // eslint-disable-line no-unused-vars
    const taskId = 'Incorrect task ID';

    emitGetSubtaskResults({taskId})
      .then(() => {
        expect(true).to.be.false; // should fail
      })
      .catch((e) => {
        expect(e.cause).to.be.equal(`Task ID is not a number: ${taskId}`);
        expect(tasksQueueSpy.dropAllCompletedChildren).to.have.not.been.called;
      })
      .done(done);
  });

  it('should properly handle dropAllCompletedChildren', (done) => {
    const app = prepareApp(); // eslint-disable-line no-unused-vars
    const taskId = 123;

    emitDropAllCompletedChildren({taskId})
      .then(() => {
        expect(tasksQueueSpy.dropAllCompletedChildren).to.have.been.calledWithExactly(taskId);
      })
      .done(done);
  });

  it('should properly handle getTaskStartTime', (done) => {
    const app = prepareApp(); // eslint-disable-line no-unused-vars
    const taskId = 123;

    emitGetTaskStartTime({taskId})
      .then(() => {
        expect(tasksQueueSpy.getTaskStartTime).to.have.been.calledWithExactly(taskId);
      })
      .done(done);
  });
});
