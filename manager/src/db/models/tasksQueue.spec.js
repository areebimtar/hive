import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

chai.use(sinonChai);

import TasksQueue from './tasksQueue';

const QUERY = 'query';
const VALUES = [1, 2];

let SquelMock;
let DbMock;

function checkSingleTaskSchedule(parentId, retry, suspensionPoint, companyId, channelId, operation, operationData, db) {
  expect(SquelMock.insert).to.have.been.called;
  expect(SquelMock.into).to.have.been.calledWithExactly('task_queue');
  expect(SquelMock.set).to.have.been.calledWithExactly('parent_id', parentId);
  expect(SquelMock.set).to.have.been.calledWithExactly('retry', retry);
  expect(SquelMock.set).to.have.been.calledWithExactly('suspension_point', suspensionPoint);
  expect(SquelMock.set).to.have.been.calledWithExactly('company_id', companyId);
  expect(SquelMock.set).to.have.been.calledWithExactly('channel_id', channelId);
  expect(SquelMock.set).to.have.been.calledWithExactly('operation', operation);
  expect(SquelMock.set).to.have.been.calledWithExactly('operation_data', operationData);
  expect(SquelMock.returning).to.have.been.calledWithExactly('id');
  expect(SquelMock.toParam).to.have.been.called;
  expect(db.one).to.have.been.calledWithExactly(QUERY, VALUES);
}

describe('TaskQueue DB model', () => {
  beforeEach(() => {
    const sessionSquelMock = {
      useFlavour: sinon.spy(() => { return sessionSquelMock; }),
      insert: sinon.spy(() => { return sessionSquelMock; }),
      update: sinon.spy(() => { return sessionSquelMock; }),
      table: sinon.spy(() => { return sessionSquelMock; }),
      into: sinon.spy(() => { return sessionSquelMock; }),
      set: sinon.spy(() => { return sessionSquelMock; }),
      where: sinon.spy(() => { return sessionSquelMock; }),
      returning: sinon.spy(() => { return sessionSquelMock; }),
      toParam: sinon.spy(() => { return {text: QUERY, values: VALUES }; }),
      str: sinon.spy(() => { return 'str'; })
    };
    SquelMock = sessionSquelMock;
    TasksQueue.__Rewire__('pgSquel', SquelMock);


    DbMock = {
      none: sinon.spy(() => Promise.resolve()),
      one: sinon.spy(() => Promise.resolve({id: 123}))
    };
  });

  afterEach(() => {
    TasksQueue.__ResetDependency__('pgSquel');
  });

  it('should provide expected interface', () => {
    const taskQueue = new TasksQueue(DbMock);
    expect(taskQueue.getAllUnfinishedTasks).to.be.a('function');
    expect(taskQueue.enqueueTask).to.be.a('function');
    expect(taskQueue.setTaskState).to.be.a('function');
  });

  it('should put single task to the database', (done) => {
    const COMPANY_ID = 'COMPANY_ID';
    const CHANNEL_ID = 'CHANNEL_ID';
    const OPERATION = 'OPERATION';
    const OPERATION_DATA = 'OPERATION_DATA';
    const PARENT_ID = 123;
    const RETRY = 3;
    const SUSPENSION_POINT = 'MY_POINT';

    const taskQueue = new TasksQueue(DbMock);
    taskQueue.enqueueTask(PARENT_ID, RETRY, SUSPENSION_POINT, COMPANY_ID, CHANNEL_ID, OPERATION, OPERATION_DATA)
      .then(() => {
        checkSingleTaskSchedule(PARENT_ID, RETRY, SUSPENSION_POINT, COMPANY_ID, CHANNEL_ID, OPERATION, OPERATION_DATA, DbMock);
        done();
      })
      .catch((e) => {
        done(e);
      });
  });

  it('should normally handle undefined operation data', (done) => {
    const COMPANY_ID = 'COMPANY_ID';
    const CHANNEL_ID = 'CHANNEL_ID';
    const OPERATION = 'OPERATION';

    const taskQueue = new TasksQueue(DbMock);
    taskQueue.enqueueTask(undefined, undefined, undefined, COMPANY_ID, CHANNEL_ID, OPERATION, undefined)
      .then(() => {
        checkSingleTaskSchedule(null, 0, null, COMPANY_ID, CHANNEL_ID, OPERATION, undefined, DbMock);
        done();
      })
      .catch((e) => {
        done(e);
      });
  });

  it('should use db connection passed to enqueue, instead of stored during initialization', (done) => {
    const COMPANY_ID = 'COMPANY_ID';
    const CHANNEL_ID = 'CHANNEL_ID';
    const OPERATION = 'OPERATION';
    const OverrideDbMock = {
      none: sinon.spy(() => Promise.resolve()),
      one: sinon.spy(() => Promise.resolve({id: 123}))
    };

    const taskQueue = new TasksQueue(DbMock);
    taskQueue.enqueueTask(undefined, undefined, undefined, COMPANY_ID, CHANNEL_ID, OPERATION, undefined, OverrideDbMock)
      .then(() => {
        checkSingleTaskSchedule(null, 0, null, COMPANY_ID, CHANNEL_ID, OPERATION, undefined, OverrideDbMock);
        expect(DbMock.none).to.have.been.notCalled;
        done();
      })
      .catch((e) => {
        done(e);
      });
  });

  it('should set task state', (done) => {
    const TASK_ID = 'TASK_ID';
    const STATE = 'STATE';
    const STATE_TTL = 10;

    const taskQueue = new TasksQueue(DbMock);
    taskQueue.setTaskState(TASK_ID, STATE, STATE_TTL)
      .then(() => {
        expect(SquelMock.str).to.have.been.calledWithExactly('now() + interval \'? milliseconds\'', STATE_TTL);
        expect(SquelMock.update).to.have.been.called;
        expect(SquelMock.table).to.have.been.calledWithExactly('task_queue');
        expect(SquelMock.set).to.have.been.calledWithExactly('state', STATE);
        expect(SquelMock.set).to.have.been.calledWithExactly('state_expires_at', 'str' );
        expect(SquelMock.where).to.have.been.calledWithExactly('id = ?::bigint', TASK_ID);
        expect(SquelMock.toParam).to.have.been.called;
        expect(DbMock.none).to.have.been.calledWithExactly(QUERY, VALUES);

        done();
      })
      .catch((e) => {
        done(e);
      });
  });

  it('should set task state without expiration', (done) => {
    const TASK_ID = 'TASK_ID';
    const STATE = 'STATE';

    const taskQueue = new TasksQueue(DbMock);
    taskQueue.setTaskState(TASK_ID, STATE)
      .then(() => {
        expect(SquelMock.str).to.have.not.been.called;
        expect(SquelMock.update).to.have.been.called;
        expect(SquelMock.table).to.have.been.calledWithExactly('task_queue');
        expect(SquelMock.set).to.have.been.calledWithExactly('state', STATE);
        expect(SquelMock.set).to.have.been.calledWithExactly('state_expires_at', null);
        expect(SquelMock.where).to.have.been.calledWithExactly('id = ?::bigint', TASK_ID);
        expect(SquelMock.toParam).to.have.been.called;
        expect(DbMock.none).to.have.been.calledWithExactly(QUERY, VALUES);

        done();
      })
      .catch((e) => {
        done(e);
      });
  });
});

describe('TaskQueue DB model::clearModifiedFlag', () => {
  it('should set modified flag to false', async () => {
    const dbMock = {none: sinon.spy()};
    const taskQueue = new TasksQueue(dbMock);

    const expectedQuery = 'UPDATE task_queue SET modified = $1 WHERE (id=$2::bigint)';
    const expectedValues = [false, 1];

    await taskQueue.clearModifiedFlag(1);

    expect(dbMock.none).to.have.been.calledWithExactly(expectedQuery, expectedValues);
  });
});
