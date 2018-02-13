import Promise from 'bluebird';
import _ from 'lodash';
import moment from 'moment';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { TASK } from '../constants';

chai.use(sinonChai);

import TasksQueue from './tasksQueue';

// TODO: Remove when babel6 will be solved
const LoggerMock = {
  info: () => {},
  debug: () => { },
  error: () => { }
};

const TestTask1 = {
  id: '1111',
  company_id: '5111',
  channel_id: '6111',
  operation: 'OPERATION1',
  operation_data: 'OPERATION_DATA1',
  created_at: 1
};

const TestTask2 = {
  id: 2222,
  company_id: 5222,
  channel_id: 6222,
  operation: 'OPERATION2',
  operation_data: 'OPERATION_DATA2',
  created_at: 2
};

const TestTask3 = {
  id: 3333,
  company_id: 5333,
  channel_id: 6333,
  operation: 'OPERATION3',
  operation_data: 'OPERATION_DATA3'
};

const TestTask4 = {
  id: 4444,
  company_id: 5444,
  channel_id: 6444,
  operation: 'OPERATION4',
  operation_data: 'OPERATION_DATA4'
};

const TestTask5 = {
  id: 5555,
  company_id: 5555,
  channel_id: 6555,
  operation: 'OPERATION5',
  operation_data: 'OPERATION_DATA5'
};

let nextTaskId = 0;

const tasksQueueModelSpy = {
  constructor: sinon.spy(() => {}),
  setTaskState: sinon.spy(() => { return Promise.resolve(); }),
  enqueueTask: sinon.spy(() => { return Promise.resolve(nextTaskId++); }),
  getAllUnfinishedTasks: sinon.spy(() => { return Promise.resolve([TestTask1, TestTask2]); }),
  markTaskModified: sinon.spy(() => { return Promise.resolve(); })
};

const configMock = {
  manager: {
    dailyQuotaReserve: 20,
    rateLimitPerSecond: 1
  }
};

// Helper function. When TasksQueue reads two tasks from TasksQueueModelMock
// We need to skip them and obtain first task enqueued manually
function getFirstTaskId(tasksQueue) {
  const keys = _(tasksQueue._taskIndex)
    .keys()
    .map((taskId) => { return parseInt(taskId, 10); })
    .reject((taskId) => { return (taskId === parseInt(TestTask1.id, 10)) || (taskId === TestTask2.id); })
    .value();

  expect(keys.length).to.be.equal(1); // there should remain only newly inserted task

  // remember parent task id
  return keys[0];
}

let clock = undefined;
describe('TaskQueue', () => {
  beforeEach(() => {
    class TasksQueueModelMock {
      constructor() {
        return tasksQueueModelSpy.constructor.apply(this, arguments);
      }
      setTaskState() {
        return tasksQueueModelSpy.setTaskState.apply(this, arguments);
      }
      enqueueTask() {
        return tasksQueueModelSpy.enqueueTask.apply(this, arguments);
      }
      getAllUnfinishedTasks() {
        return tasksQueueModelSpy.getAllUnfinishedTasks.apply(this, arguments);
      }
      markTaskModified() {
        return tasksQueueModelSpy.markTaskModified.apply(this, arguments);
      }
    }

    nextTaskId = 1;

    TasksQueue.__Rewire__('TasksQueueModel', TasksQueueModelMock);

    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    TasksQueue.__ResetDependency__('TasksQueueModel');
    clock.restore();
    clock = undefined;
  });

  it('should provide expected interface', () => {
    expect(TasksQueue.prototype.enqueue).to.be.a('function');
    expect(TasksQueue.prototype.startTask).to.be.a('function');
    expect(TasksQueue.prototype.pauseTask).to.be.a('function');
    expect(TasksQueue.prototype.resumeTask).to.be.a('function');
    expect(TasksQueue.prototype.finishTask).to.be.a('function');
    // expect(DbMock.none).to.have.been.calledWithExactly(QUERY, VALUES);
  });

  it('should be properly initialized', (done) => {
    const db = {
      field: 'value'
    };
    const tasksQueue = new TasksQueue(db, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    expect(tasksQueueModelSpy.constructor).to.have.been.calledWithExactly(db);

    tasksQueue.init()
      .then(() => {
        expect(tasksQueueModelSpy.getAllUnfinishedTasks).to.have.been.called;
        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(2);

        const task1 = tasksQueue._taskIndex[TestTask1.id];
        expect(task1.id).to.be.equal(parseInt(TestTask1.id, 10));
        expect(task1.companyId).to.be.equal(parseInt(TestTask1.company_id, 10));
        expect(task1.channelId).to.be.equal(parseInt(TestTask1.channel_id, 10));
        expect(task1.operation).to.be.equal(TestTask1.operation);
        expect(task1.operationData).to.be.equal(TestTask1.operation_data);
        expect(task1.createdAt.valueOf()).to.be.equal(moment(TestTask1.created_at).valueOf());

        const task2 = tasksQueue._taskIndex[TestTask2.id];
        expect(task2.id).to.be.equal(TestTask2.id);
        expect(task2.companyId).to.be.equal(TestTask2.company_id);
        expect(task2.channelId).to.be.equal(TestTask2.channel_id);
        expect(task2.operation).to.be.equal(TestTask2.operation);
        expect(task2.operationData).to.be.equal(TestTask2.operation_data);
        expect(task2.createdAt.valueOf()).to.be.equal(moment(TestTask2.created_at).valueOf());
        done();
      })
      .catch(done);
  });

  it('should be able to properly enqueue single task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data))
      .then(() => {
        const expectedTask = {
          id: nextTaskId - 1,
          companyId: TestTask3.company_id,
          channelId: TestTask3.channel_id,
          operation: TestTask3.operation,
          operationData: TestTask3.operation_data,
          createdAt: moment(),
          parentTaskId: undefined,
          retry: 0,
          queueId: `${TestTask3.company_id}_${TestTask3.channel_id}_`
        };

        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(3); // first two will be taken from the DB
        expect(tasksQueue._taskIndex[nextTaskId - 1]).to.be.deep.equal(expectedTask);
        done();
      })
      .catch(done);
  });

  it('should not enqueue task which is already in queue', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask2.company_id, TestTask2.channel_id, TestTask2.operation, TestTask2.operation_data))
      .then(() => {
        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(2); // first two will be taken from the DB
        done();
      })
      .catch(done);
  });

  it('should be able to properly enqueue multiple tasks', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    const OPERATION_DATA3_1 = 'OPERATION_DATA3_1';
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, [TestTask3.operation_data, OPERATION_DATA3_1]))
      .then(() => {
        const expectedTask1 = {
          id: nextTaskId - 2,
          companyId: TestTask3.company_id,
          channelId: TestTask3.channel_id,
          operation: TestTask3.operation,
          operationData: TestTask3.operation_data,
          createdAt: moment(),
          parentTaskId: undefined,
          retry: 0,
          queueId: `${TestTask3.company_id}_${TestTask3.channel_id}_`
        };
        const expectedTask2 = {
          id: nextTaskId - 1,
          companyId: TestTask3.company_id,
          channelId: TestTask3.channel_id,
          operation: TestTask3.operation,
          operationData: OPERATION_DATA3_1,
          createdAt: moment(),
          parentTaskId: undefined,
          retry: 0,
          queueId: `${TestTask3.company_id}_${TestTask3.channel_id}_`
        };

        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(4); // first two will be taken from the DB
        expect(tasksQueue._taskIndex[nextTaskId - 2]).to.be.deep.equal(expectedTask1);
        expect(tasksQueue._taskIndex[nextTaskId - 1]).to.be.deep.equal(expectedTask2);
        done();
      })
      .catch(done);
  });

  it('should be possible to start unstarted task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    const TTL = 123;
    tasksQueue.init()
      .then(tasksQueue.startTask.bind(tasksQueue, TestTask2.id, TTL))
      .then(() => {
        const expectedTask = {
          id: TestTask2.id,
          companyId: TestTask2.company_id,
          channelId: TestTask2.channel_id,
          operation: TestTask2.operation,
          operationData: TestTask2.operation_data,
          createdAt: moment(TestTask2.created_at),
          state: TASK.STATE.STARTED,
          stateExpiresAt: moment().add(TTL, 'milliseconds'),
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: TTL,
          queueId: `${TestTask2.company_id}_${TestTask2.channel_id}_`
        };

        expect(tasksQueueModelSpy.setTaskState).to.be.calledWithExactly(TestTask2.id, TASK.STATE.STARTED, TTL, undefined, undefined);

        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(2); // first two will be taken from the DB
        expect(tasksQueue._taskIndex[TestTask2.id]).to.be.deep.equal(expectedTask);
        done();
      })
      .catch(done);
  });

  it('should provide tasks in expected order', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    tasksQueue.init()
      .then(tasksQueue.startTask.bind(tasksQueue, parseInt(TestTask1.id, 10), 1000))
      .then(tasksQueue.getTask.bind(tasksQueue))
      .then((task) => {
        const expectedTask = {
          id: TestTask2.id,
          companyId: TestTask2.company_id,
          channelId: TestTask2.channel_id,
          operation: TestTask2.operation,
          operationData: TestTask2.operation_data,
          createdAt: moment(TestTask2.created_at),
          state: undefined,
          stateExpiresAt: undefined,
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: 0,
          queueId: `${TestTask2.company_id}_${TestTask2.channel_id}_`
        };

        expect(task).to.be.deep.equal(expectedTask);
        done();
      })
      .catch(done);
  });

  it('should be able to properly enqueue child task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    let firstTaskId = undefined;
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data))
      .then(() => {
        firstTaskId = getFirstTaskId(tasksQueue);
        return tasksQueue.enqueue(TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, firstTaskId);
      })
      .then(() => {
        const expectedTask = {
          id: nextTaskId - 1,
          companyId: TestTask3.company_id,
          channelId: TestTask3.channel_id,
          operation: TestTask3.operation,
          operationData: TestTask3.operation_data,
          createdAt: moment(),
          parentTaskId: firstTaskId,
          retry: 0,
          queueId: `${TestTask4.company_id}_${TestTask4.channel_id}_` // queueId should be taken from parent
        };

        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(4); // first two will be taken from the DB
        expect(tasksQueue._taskIndex[nextTaskId - 1]).to.be.deep.equal(expectedTask);
        done();
      })
      .catch(done);
  });

  it('should be able to return all WIP children of specified task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    let firstTaskId = undefined;
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data))
      .then(() => {
        firstTaskId = getFirstTaskId(tasksQueue);
        return tasksQueue.enqueue(TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.enqueue(TestTask5.company_id, TestTask5.channel_id, TestTask5.operation, TestTask5.operation_data, firstTaskId);
      })
      .then(() => {
        const wipChildren = tasksQueue.getAllWipChildren(firstTaskId);
        const expectedChildren = [
          {
            id: nextTaskId - 2,
            companyId: TestTask3.company_id,
            channelId: TestTask3.channel_id,
            operation: TestTask3.operation,
            operationData: TestTask3.operation_data,
            createdAt: moment(),
            parentTaskId: firstTaskId,
            retry: 0,
            queueId: `${TestTask4.company_id}_${TestTask4.channel_id}_` // queueId should be taken from parent
          },
          {
            id: nextTaskId - 1,
            companyId: TestTask5.company_id,
            channelId: TestTask5.channel_id,
            operation: TestTask5.operation,
            operationData: TestTask5.operation_data,
            createdAt: moment(),
            parentTaskId: firstTaskId,
            retry: 0,
            queueId: `${TestTask4.company_id}_${TestTask4.channel_id}_` // queueId should be taken from parent
          }
        ];
        expect(wipChildren).to.be.deep.equal(expectedChildren);
      })
      .then(() => {
        return tasksQueue.startTask(nextTaskId - 2, 1000);
      })
      .then(() => {
        return tasksQueue.finishTask(nextTaskId - 2, false); // FAIL task
      })
      .then(() => {
        const wipChildren = tasksQueue.getAllWipChildren(firstTaskId);
        const expectedChildren = [
          {
            id: nextTaskId - 1,
            companyId: TestTask5.company_id,
            channelId: TestTask5.channel_id,
            operation: TestTask5.operation,
            operationData: TestTask5.operation_data,
            createdAt: moment(),
            parentTaskId: firstTaskId,
            retry: 0,
            queueId: `${TestTask4.company_id}_${TestTask4.channel_id}_` // queueId should be taken from parent
          }
        ];
        expect(wipChildren).to.be.deep.equal(expectedChildren);
        done();
      })
      .catch(done);
  });

  it('should be able to check if specified task has any WIP child', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    let firstTaskId = undefined;
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data))
      .then(() => {
        firstTaskId = getFirstTaskId(tasksQueue);
        return tasksQueue.enqueue(TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.enqueue(TestTask5.company_id, TestTask5.channel_id, TestTask5.operation, TestTask5.operation_data, firstTaskId);
      })
      .then(() => {
        expect(tasksQueue.hasTaskChildInProgress(firstTaskId)).to.be.true;
      })
      .then(() => {
        return tasksQueue.startTask(nextTaskId - 2, 1000);
      })
      .then(() => {
        return tasksQueue.finishTask(nextTaskId - 2, false);
      })
      .then(() => {
        expect(tasksQueue.hasTaskChildInProgress(firstTaskId)).to.be.true;
      })
      .then(() => {
        return tasksQueue.startTask(nextTaskId - 1, 1000);
      })
      .then(() => {
        return tasksQueue.finishTask(nextTaskId - 1, false);
      }).then(() => {
        expect(tasksQueue.hasTaskChildInProgress(firstTaskId)).to.be.false;
        done();
      })
      .catch(done);
  });

  it('should be able to return all failed children of specified task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    let firstTaskId = undefined;
    const FAIL_REASON = 'fail reason';
    const TTL = 1000;
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data))
      .then(() => {
        firstTaskId = getFirstTaskId(tasksQueue);
        return tasksQueue.enqueue(TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.enqueue(TestTask5.company_id, TestTask5.channel_id, TestTask5.operation, TestTask5.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.startTask(nextTaskId - 2, TTL);
      })
      .then(() => {
        return tasksQueue.finishTask(nextTaskId - 2, FAIL_REASON, false); // FAIL task
      })
      .then(() => {
        const failedChildren = tasksQueue.getFailedChildren(firstTaskId);
        const expectedChild = {
          id: nextTaskId - 2,
          companyId: TestTask3.company_id,
          channelId: TestTask3.channel_id,
          operation: TestTask3.operation,
          operationData: TestTask3.operation_data,
          createdAt: moment(),
          parentTaskId: firstTaskId,
          queueId: `${TestTask4.company_id}_${TestTask4.channel_id}_`, // queueId should be taken from parent
          state: TASK.STATE.FAILED,
          stateExpiresAt: undefined,
          ttl: TTL,
          retry: 0
        };

        expect(failedChildren).to.be.deep.equal([expectedChild]);
        done();
      })
      .catch(done);
  });

  it('should be able to return all children of specified task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    let firstTaskId = undefined;
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data))
      .then(() => {
        firstTaskId = getFirstTaskId(tasksQueue);
        return tasksQueue.enqueue(TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.enqueue(TestTask5.company_id, TestTask5.channel_id, TestTask5.operation, TestTask5.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.startTask(nextTaskId - 2, 1000);
      })
      .then(() => {
        return tasksQueue.finishTask(nextTaskId - 2, undefined, false); // FAIL task
      })
      .then(() => {
        const children = tasksQueue.getAllChildrenResults(firstTaskId);
        const expectedChildren = [
          { id: nextTaskId - 2, result: false, state: 'failed' },
          { id: nextTaskId - 1, result: true, state: undefined }
        ];

        expect(children).to.be.deep.equal(expectedChildren);

        done();
      })
      .catch(done);
  });

  it('should be able to drop all completed children of specified task', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    let firstTaskId = undefined;
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data))
      .then(() => {
        firstTaskId = getFirstTaskId(tasksQueue);
        return tasksQueue.enqueue(TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.enqueue(TestTask5.company_id, TestTask5.channel_id, TestTask5.operation, TestTask5.operation_data, firstTaskId);
      })
      .then(() => {
        return tasksQueue.startTask(nextTaskId - 2, 1000);
      })
      .then(() => {
        return tasksQueue.finishTask(nextTaskId - 2, undefined, false); // FAIL task
      })
      .then(() => {
        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(5); // all tasks are present
        tasksQueue.dropAllCompletedChildren(firstTaskId);
        expect(_.keys(tasksQueue._taskIndex).length).to.be.equal(4); // one task should be removed
        // TODO: verify that task has been removed from `priority queue`

        done();
      })
      .catch(done);
  });

  it('should return timed out tasks', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock); // TODO: Remove when babel6 will be solved
    const TTL = 1000;
    tasksQueue.init()
      .then((tasksQueue.startTask.bind(tasksQueue, 1111, TTL)))
      .then(() => { clock.tick(TTL + 1); })
      .then((tasksQueue.getTimedOutTasks.bind(tasksQueue)))
      .then((tasks) => {
        expect(tasks.length).to.be.equal(1);
        expect(tasks[0].id).to.be.equal(1111);
        done();
      })
      .catch(done);
  });

  it('should not provide tasks for shops with consumed quota', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    const QUOTA_DAILY_LIMIT = 10;
    tasksQueue.init()
      .then(tasksQueue.setQuota.bind(tasksQueue, parseInt(TestTask1.id, 10), QUOTA_DAILY_LIMIT, QUOTA_DAILY_LIMIT * 0.2, 1234)) // set consumed requests value to 20% of daily limit
      .then(tasksQueue.getTask.bind(tasksQueue)) // ^^^ so second task should be returned
      .then((task) => {
        const expectedTask = {
          id: TestTask2.id,
          companyId: TestTask2.company_id,
          channelId: TestTask2.channel_id,
          operation: TestTask2.operation,
          operationData: TestTask2.operation_data,
          createdAt: moment(TestTask2.created_at),
          state: undefined,
          stateExpiresAt: undefined,
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: 0,
          queueId: `${TestTask2.company_id}_${TestTask2.channel_id}_`
        };

        expect(task).to.be.deep.equal(expectedTask);
      })
      .then(tasksQueue.setQuota.bind(tasksQueue, parseInt(TestTask1.id, 10), QUOTA_DAILY_LIMIT, QUOTA_DAILY_LIMIT, 1235)) // set quota to positive number for first task
      .then(tasksQueue.getTask.bind(tasksQueue)) // ^^^ so first task should be returned
      .then((task) => {
        const expectedTask = {
          id: parseInt(TestTask1.id, 10),
          companyId: parseInt(TestTask1.company_id, 10),
          channelId: parseInt(TestTask1.channel_id, 10),
          operation: TestTask1.operation,
          operationData: TestTask1.operation_data,
          createdAt: moment(TestTask1.created_at),
          state: undefined,
          stateExpiresAt: undefined,
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: 0,
          queueId: `${TestTask1.company_id}_${TestTask1.channel_id}_`
        };

        expect(task).to.be.deep.equal(expectedTask);
      })
      .then(tasksQueue.consumeQuota.bind(tasksQueue, parseInt(TestTask1.id, 10), QUOTA_DAILY_LIMIT)) // consume whole daily limit requests for first task
      .then(tasksQueue.getTask.bind(tasksQueue)) // ^^^ so second task should be returned
      .then((task) => {
        const expectedTask = {
          id: TestTask2.id,
          companyId: TestTask2.company_id,
          channelId: TestTask2.channel_id,
          operation: TestTask2.operation,
          operationData: TestTask2.operation_data,
          createdAt: moment(TestTask2.created_at),
          state: undefined,
          stateExpiresAt: undefined,
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: 0,
          queueId: `${TestTask2.company_id}_${TestTask2.channel_id}_`
        };

        expect(task).to.be.deep.equal(expectedTask);
        done();
      })
      .catch(done);
  });

  it('should stop providing tasks for queues with exhausted rate limit', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data, parseInt(TestTask1.id, 10)))
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, parseInt(TestTask1.id, 10)))
      .then(tasksQueue.getTask.bind(tasksQueue)) // first task should be returned
      .then((task) => {
        const expectedTask = {
          id: parseInt(TestTask1.id, 10),
          companyId: parseInt(TestTask1.company_id, 10),
          channelId: parseInt(TestTask1.channel_id, 10),
          operation: TestTask1.operation,
          operationData: TestTask1.operation_data,
          createdAt: moment(TestTask1.created_at),
          state: undefined,
          stateExpiresAt: undefined,
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: 0,
          queueId: `${TestTask1.company_id}_${TestTask1.channel_id}_`
        };

        expect(task).to.be.deep.equal(expectedTask);
        const queue = tasksQueue._getQueue(task);
        expect(queue.tasksActive).to.be.equal(0);
        return tasksQueue.startTask(task.id) // when task started tasksActive counter should be increased
          .then(() => {
            expect(queue.tasksActive).to.be.equal(1);
          });
      })
      .then(tasksQueue.getTask.bind(tasksQueue)) // second task should be returned (from another queue)
      .then((task) => {
        const expectedTask = {
          id: TestTask2.id,
          companyId: TestTask2.company_id,
          channelId: TestTask2.channel_id,
          operation: TestTask2.operation,
          operationData: TestTask2.operation_data,
          createdAt: moment(TestTask2.created_at),
          state: undefined,
          stateExpiresAt: undefined,
          parentTaskId: undefined,
          retry: 0,
          suspensionPoint: undefined,
          modified: false,
          ttl: 0,
          queueId: `${TestTask2.company_id}_${TestTask2.channel_id}_`
        };
        expect(task).to.be.deep.equal(expectedTask);
        const queue = tasksQueue._getQueue(task);
        expect(queue.tasksActive).to.be.equal(0);
        return tasksQueue.pauseTask(parseInt(TestTask1.id, 10), '', 1000); // this should release queue
      })
      .then(tasksQueue.getTask.bind(tasksQueue)) // fourht task should be returned, because it is a first child of first task
      .then((task) => {
        const expectedTask = {
          id: 1,
          parentTaskId: parseInt(TestTask1.id, 10),
          companyId: parseInt(TestTask4.company_id, 10),
          channelId: parseInt(TestTask4.channel_id, 10),
          operation: TestTask4.operation,
          operationData: TestTask4.operation_data,
          createdAt: moment(),
          retry: 0,
          queueId: `${TestTask1.company_id}_${TestTask1.channel_id}_` // queueId should be taken from parent
        };
        expect(task).to.be.deep.equal(expectedTask);
        done();
      })
      .catch(done);
  });

  it('should properly calculate task start time for simultaneous requests', (done) => {
    const tasksQueue = new TasksQueue({}, configMock, LoggerMock);
    const oldRateLimit = configMock.manager.rateLimitPerSecond;
    configMock.manager.rateLimitPerSecond = 3;

    const knownTaskId = [parseInt(TestTask1.id, 10), TestTask2.id];
    function getNewTaskId() {
      const taskIds = _(tasksQueue._taskIndex)
        .keys()
        .map((key) => { return parseInt(key, 10); })
        .difference(knownTaskId)
        .value();

      expect(taskIds.length).to.be.equal(1);
      return taskIds[0];
    }

    let task4Id = undefined;
    let task3Id = undefined;
    const delay = Math.ceil(1000 / configMock.manager.rateLimitPerSecond);

    tasksQueue.init()
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask4.company_id, TestTask4.channel_id, TestTask4.operation, TestTask4.operation_data, parseInt(TestTask1.id, 10)))
      .then(() => {
        task4Id = getNewTaskId();
        knownTaskId.push(task4Id);
      })
      .then(tasksQueue.enqueue.bind(tasksQueue, TestTask3.company_id, TestTask3.channel_id, TestTask3.operation, TestTask3.operation_data, parseInt(TestTask1.id, 10)))
      .then(() => {
        task3Id = getNewTaskId();
        knownTaskId.push(task3Id);
      })
      .then(tasksQueue.getTask.bind(tasksQueue)) // first task should be returned
      .then((task) => {
        const firstTaskTime = tasksQueue.getTaskStartTime(task.id).valueOf();
        const secondTaskTime = tasksQueue.getTaskStartTime(task4Id).valueOf();
        const thirdTaskTime = tasksQueue.getTaskStartTime(task3Id).valueOf();

        expect(secondTaskTime).to.be.above(firstTaskTime);
        expect(thirdTaskTime).to.be.above(secondTaskTime);

        clock.tick(delay * 3 + 1); // move now after thirdTaskTime + delay
      })
      .then(() => {
        const secondTaskTime = tasksQueue.getTaskStartTime(task4Id).valueOf();
        const thirdTaskTime = tasksQueue.getTaskStartTime(task3Id).valueOf();
        expect(secondTaskTime.valueOf()).to.be.equal(moment().valueOf());
        expect(thirdTaskTime).to.be.above(secondTaskTime);

        configMock.manager.rateLimitPerSecond = oldRateLimit;

        done();
      })
      .catch(() => {
        configMock.manager.rateLimitPerSecond = oldRateLimit;
        done();
      });
  });
});
