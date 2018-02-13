import _ from 'lodash';
import Promise from 'bluebird';

import WorkerPool from './modules/workerPool';
import TasksQueue from './modules/tasksQueue';
import Worker from './modules/worker';
import RabbitClient from './rabbit/rabbitClient';

import { MANAGER, WORKER, OPERATIONS } from '../../shared/constants';
import { TASK } from './constants';
import Etsy from './modules/etsy';

const Channels = {
  [Etsy.ID]: Etsy
};

export default class App {
  constructor(db, Models, config, logger) {
    this._db = db;
    this._models = Models(db);
    this._config = config;
    this._logger = logger; // TODO: Temporary solution, until we solve the babel6 issues

    this._pool = new WorkerPool(logger); // TODO: Temporary solution, until we solve the babel6 issues
    this._assignedWorkers = {}; // MAP task id to worker
    this._workerTask = {}; // MAP worker id to task

    this._taskQueue = new TasksQueue(db, config, logger); // TODO: Temporary solution ^^
    this._logger.info(`Reserve ${config.manager.dailyQuotaReserve}% of daily quota. Manager will limit requests rate to ${config.manager.rateLimitPerSecond} requests per second`);

    this._runTaskCounter = 0;
  }

  _subscribeEnqueueHandler(socket) {
    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.ENQUEUE, async (args, callback) => {
      // if requested operation is shop sync, we need to check if shop is valid first
      if (args.operation === OPERATIONS.SYNC_SHOP) {
        const shop = await this._models.shops.getById(args.operationData);
        if (!shop || shop.invalid) {
          // shop is not valid, fail sync
          callback({result: MANAGER.TASK_RESULTS.FAILED, cause: `Cannot enqueue shop ${shop.id}. Shop is marked as invalid: ${shop.error}`});
          return;
        }
      }

      this._enqueue(args).then(taskId => {
        this._logger.debug(`Operation(s) has been successfully enqueued, taskId: ${taskId}`);
        if (typeof(callback) === 'function') {
          callback({result: MANAGER.TASK_RESULTS.SUCCEEDED});
        }
      }).catch(e => {
        if (typeof(callback) === 'function') {
          callback({result: MANAGER.TASK_RESULTS.FAILED, cause: e.message});
        }

        this._logger.error('Unable to enqueue operation: ', args);
        this._logger.debug(e);
      });
    });
  }

  _subscribeGetSubtaskResultsHandler(socket) {
    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.GET_SUBTASK_RESULTS, (args, callback) => {
      const taskId = parseInt(args.taskId, 10);
      if (!_.isFinite(taskId)) { throw new Error(`Task ID is not a number: ${args.taskId}`); }

      if (typeof(callback) === 'function') {
        callback({result: MANAGER.TASK_RESULTS.SUCCEEDED, data: this._taskQueue.getAllChildrenResults(taskId)});
      }
    });
  }

  _subscribeHasWipChildrenHandler(socket) {
    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.HAS_WIP_SUBTASKS, (args, callback) => {
      const taskId = parseInt(args.taskId, 10);

      if (!_.isFinite(taskId)) { throw new Error(`Task ID is not a number: ${args.taskId}`); }

      this._logger.debug(`HasWipChildren handler: Check if task #${taskId} has at least one child in progress`);

      if (typeof(callback) === 'function') {
        callback({result: MANAGER.TASK_RESULTS.SUCCEEDED, data: (this._taskQueue.hasTaskChildInProgress(taskId))});
      }
    });
  }


  _subscribeReportQuotaHandler(socket) {
    function parseQuota(taskId, quotas = {}, name) {
      const quota = parseInt(quotas[name], 10);
      if (!_.isFinite(quota)) {
        // eslint-disable-next-line no-throw-literal
        throw `Task #${taskId}, ${name} is not a number: ${quotas[name]}`;
      } else {
        return quota;
      }
    }

    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.REPORT_QUOTA, (args) => { // TODO: socket callback still can be invoke for exception handler
      const taskId = parseInt(args.taskId, 10);
      if (!_.isFinite(taskId)) { throw new Error(`Task ID is not a number: ${args.taskId}`); }
      try {
        const [ quotaRemaining, quotaDailyLimit, quotaTimestamp ] = [
          parseQuota(taskId, args, 'quotaRemaining'),
          parseQuota(taskId, args, 'quotaDailyLimit'),
          parseQuota(taskId, args, 'quotaTimestamp')
        ];
        // only set quota when parsing is successful
        this._taskQueue.setQuota(taskId, quotaDailyLimit, quotaRemaining, quotaTimestamp);
      } catch (e) {
        // log any quota parsing failures
        this._logger.info(e);
      }
    });
  }

  _subscribeGetTaskStartTimeHandler(socket) {
    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.GET_TASK_START_TIME, (args, callback) => {
      const taskId = parseInt(args.taskId, 10);
      if (!_.isFinite(taskId)) { throw new Error(`Task ID is not a number: ${args.taskId}`); }

      if (typeof(callback) === 'function') {
        const taskStartTime = this._taskQueue.getTaskStartTime(taskId);
        callback({result: MANAGER.TASK_RESULTS.SUCCEEDED, data: taskStartTime.valueOf()});
      }
    });
  }

  _subscribeDropAllCompletedChildrenHandler(socket) {
    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.DROP_ALL_COMPLETED_CHILDREN, (args, callback) => {
      const taskId = parseInt(args.taskId, 10);
      if (!_.isFinite(taskId)) { throw new Error(`Task ID is not a number: ${args.taskId}`); }

      if (typeof(callback) === 'function') {
        callback({result: MANAGER.TASK_RESULTS.SUCCEEDED, data: this._taskQueue.dropAllCompletedChildren(taskId)});
      }
    });
  }

  _subscribeClearModifiedFlagHandler(socket) {
    this._subscribeHandler(socket, MANAGER.TASK_OPERATIONS.CLEAR_MODIFIED_FLAG, (args, callback) => {
      const taskId = parseInt(args.taskId, 10);
      if (!_.isFinite(taskId)) { throw new Error(`Task ID is not a number: ${args.taskId}`); }

      if (typeof(callback) === 'function') {
        this._taskQueue.clearModifiedFlag(taskId);
        callback({result: MANAGER.TASK_RESULTS.SUCCEEDED});
      }
    });
  }

  // Helper method to install handler processing given operation
  _subscribeHandler(socket, op, handlerBody) {
    socket.on(op, (args, callback) => {
      this._logger.debug(`[${op}]`, args);

      try {
        handlerBody(args, callback);
      } catch (e) {
        if (typeof(callback) === 'function') {
          callback({result: MANAGER.TASK_RESULTS.FAILED, cause: e.message});
        }
        this._logger.error(`Unable to perform operation ${op}: `);
        this._logger.error(args);
        this._logger.error('---');
        this._logger.error(e);
      }
    });
  }

  _enqueue(args) {
    const companyId = parseInt(args.companyId, 10);
    const channelId = parseInt(args.channelId, 10);
    if (!_.isFinite(companyId)) { return Promise.reject(new Error(`Company ID is not a number: ${companyId}`)); }
    if (!_.isFinite(channelId)) { return Promise.reject(new Error(`Channel ID is not a number: ${channelId}`)); }
    if (!Channels[channelId]) { return Promise.reject(new Error(`Channel ID is unknown: ${channelId}`)); }
    if (!_.isString(args.operation)) { return Promise.reject(new Error('Operation should be provided.')); }

    const parentTaskId = (args.parentTaskId !== undefined) ? parseInt(args.parentTaskId, 10) : undefined;
    if ((args.parentTaskId !== undefined) && !_.isFinite(parentTaskId)) {
      return Promise.reject(new Error(`Parent task ID is not a number: ${args.parentTaskId}`));
    }

    if (parentTaskId && !this._taskQueue.getTaskById(parentTaskId)) {
      return Promise.reject(new Error(`Parent task #${parentTaskId} doesn't exist`));
    }

    const retry = (args.retry !== undefined) ?  parseInt(args.retry, 10) : 0;
    if (!_.isFinite(retry)) {
      return Promise.reject(new Error(`Retry count is not a number: ${args.retry}`));
    }

    return this._taskQueue.enqueue(companyId, channelId, args.operation, args.operationData, parentTaskId, retry);
  }

  _scheduleNextTick() {
    setTimeout(this._runTasks.bind(this), App.CHECK_INTERVAL);
  }

  _checkParentIsDone(parentTaskId) {
    if (parentTaskId === undefined) { return Promise.resolve(); } // No parent task, nothing to do

    this._logger.debug(`Check parent #${parentTaskId} is done`);
    if (this._taskQueue.hasTaskChildInProgress(parentTaskId)) {
      this._logger.debug('There is a child task in progress');
      return Promise.resolve();
    }

    this._logger.debug('There are no active children remain');

    return this._taskQueue.resumeTask(parentTaskId, App.TASK_EXECUTION_TIMEOUT);
  }

  _handleTaskSucceded(taskId, reason) {
    const task = this._taskQueue.getTaskById(taskId);
    if (!task) {
      // This may happen if this task has already been finished
      // because of time-out, for example
      this._logger.debug(`Unable to finish task #${taskId}, task not found`);
      return Promise.resolve();
    }

    return this._taskQueue.finishTask(task.id, reason, true)
      .then(this._checkParentIsDone.bind(this, task.parentTaskId));
  }

  _failTaskChildren(parentTaskId, reason) {
    const children = this._taskQueue.getAllWipChildren(parentTaskId);

    if (!children.length) {
      this._logger.debug(`Task #${parentTaskId} has no children`);
      return Promise.resolve();
    }

    this._logger.debug(`Fail ${children.length} children of task #${parentTaskId}`);

    const promises = _.map(children, (child) => {
      this._logger.debug(`Child #${child.id} is '${child.state}', fail it.`);
      return this._handleTaskFailed(child.id, reason, false, false); // Disallow retry for children, do not check parent
    });

    return Promise.all(promises)
      .then(() => {
        if (children.length) {
          this._logger.debug(`Drop all children of ${parentTaskId}`);
          // Completely remove failed tasks from the queue
          this._taskQueue.dropAllCompletedChildren(parentTaskId);
        }
      });
  }

  _handleTaskFailed(taskId, reason, retryAllowed = true, checkParent = true) {
    const task = this._taskQueue.getTaskById(taskId);
    if (!task) {
      // This may happen if this task has already been finished
      // because of time-out, for example
      this._logger.debug(`Unable to fail task #${taskId}, task not found`);
      return Promise.resolve();
    }

    this._logger.debug(`Handle task #${taskId} failure, Fail reason: ${reason}`);

    const canRetry = (retryAllowed && (task.retry < App.MAX_RETRY_COUNT));

    // First - fail task or schedule retry
    let promise = canRetry ? this._taskQueue.retryTask(task.id, reason) : this._taskQueue.finishTask(task.id, reason, false, !checkParent);

    // Then check his parent
    if (task.parentTaskId && checkParent) {
      promise = promise.then(this._checkParentIsDone.bind(this, task.parentTaskId));
    }

    // Then fail his children

    // If task is suspended, it can have running children, they should be failed.
    // If task is started, it can already schedule some children tasks, they should be failed.
    // If task is resumed, it, theoretically, should not have any running children, but to be sure, let's try to find them and fail.
    if ((task.state === TASK.STATE.SUSPENDED) || (task.state === TASK.STATE.STARTED) || (task.state === TASK.STATE.RESUMED)) {
      promise = promise.then(this._failTaskChildren.bind(this, taskId, `Parent failure: ${reason}`));
    }

    return promise;
  }

  _handleTaskSuspended(taskId, suspensionPoint) {
    const task = this._taskQueue.getTaskById(taskId);
    if (!task) {
      // This may happen if this task has already been finished
      // because of time-out, for example
      this._logger.debug(`Unable to suspend task #${taskId}, task not found`);
      return Promise.resolve();
    }

    // TODO: Need to check all child tasks because they can be already finished
    return this._taskQueue.pauseTask(task.id, suspensionPoint, App.TASK_SUSPENSION_TIMEOUT);
  }

  _handleTaskAborted(taskId, reason) {
    const task = this._taskQueue.getTaskById(taskId);
    if (!task) {
      // This may happen if this task has already been finished
      // because of time-out, for example
      this._logger.debug(`Unable to abort task #${taskId}, task not found`);
      return Promise.resolve();
    }

    // abort task
    let promise = this._taskQueue.abortTask(task.id, reason);

    // Then check his parent
    if (task.parentTaskId) {
      promise = promise.then(this._checkParentIsDone.bind(this, task.parentTaskId));
    }

    return promise;
  }

  _shouldRetryTask(result) {
    return !result.doNotRetry;
  }

  _handleTaskResult(taskId, worker, result) {
    this._logger.debug(`Worker has completed task #${result.taskId} with result ${result.result}`);
    this._pool.return(worker);

    let promise;

    if (result.requests) {
      if (_.isFinite(result.requests.quotaRemaining)) {
        this._logger.debug(`Set quota for task #${taskId} to ${result.requests.quotaRemaining}`);
        this._taskQueue.setQuota(taskId, result.requests.quotaDailyLimit, result.requests.quotaRemaining, result.requests.quotaTimestamp);
      } else {
        this._logger.debug(`Decrease quota for task #${taskId} by ${result.requests.requestsMade}`);
        this._taskQueue.consumeQuota(taskId, result.requests.requestsMade);
      }
    }

    switch (result.result) {
      case WORKER.TASK_RESULTS.SUCCEEDED: promise = this._handleTaskSucceded(taskId, result.data); break;
      case WORKER.TASK_RESULTS.FAILED: promise = this._handleTaskFailed(taskId, result.data, this._shouldRetryTask(result)); break;
      case WORKER.TASK_RESULTS.SUSPENDED: promise = this._handleTaskSuspended(taskId, result.data); break;
      case WORKER.TASK_RESULTS.ABORTED: promise = this._handleTaskAborted(taskId, result.data); break;
      default: {
        this._logger.error(`Unknown task result '${result.result}' for task: ${taskId}`);
        promise = Promise.resolve();
      }
    }

    return promise.then(() => {
      if (this._workerTask[worker.id]) {
        delete this._workerTask[worker.id];
      } else {
        this._logger.error(`Can't find task by worker id: _workerTask[${worker.id}] = ${JSON.stringify(this._workerTask[worker.id])})`);
      }

      if (this._assignedWorkers[taskId]) {
        delete this._assignedWorkers[taskId];
      } else {
        this._logger.error(`Can't find worker between assigned workers: _assignedWorker[${taskId}] = ${JSON.stringify(this._assignedWorkers[taskId])}`);
      }
    });
  }

  _cancelTimedOutTasks() {
    const timedOutTasks = this._taskQueue.getTimedOutTasks();

    // This should be done one-by-one, if you'll decide to refactor this
    // Please verify your code against real Etsy with real shops
    const promise = _.reduce(timedOutTasks, (result, task) => {
      this._logger.debug(`Task ${task.id} has timed out`);
      return result
        .then(this._handleTaskFailed.bind(this, task.id, 'Timed out'))
        .then(() => {
          if (this._assignedWorkers[task.id]) {
            const worker = this._assignedWorkers[task.id];
            delete this._assignedWorkers[task.id];
            delete this._workerTask[worker.id];
            worker.terminate();
          }
        });
    }, Promise.resolve());

    return promise;
  }

  _runTasks() {
    const runId = this._runTaskCounter++;
    const startTs = process.hrtime();

    this._logger.info(`Run #${runId}: Start scheduling`, {
      topic: 'runTask',
      runId,
      action: 'start'
    });

    return this._cancelTimedOutTasks()
      .then(() => {
        this._logger.info(`Run #${runId}: Timed out task cancelled.`, {
          topic: 'runTask',
          runId,
          action: 'taskCancelled'
        });
      })
      .then(() => {
        const workersAvailable = this._pool.getNumIdle();
        if (!workersAvailable) { return Promise.resolve(); } // No workers, nothing to do

        const promises = _.map(_.range(workersAvailable), () => {
          const task = this._taskQueue.getTask();
          if (!task) { return Promise.resolve(); }
          this._logger.debug(`Start task #${task.id}`);

          const worker = this._pool.borrow();

          const resume = task.state === TASK.STATE.RESUMED;

          // TODO: Rewrite following
          try {
            return this._taskQueue.startTask(task.id, App.TASK_EXECUTION_TIMEOUT)
              .then(() => {
                const updatedTask = this._taskQueue.getTaskById(task.id); // if this will fail, nothing serious will happen
                                                                          // worker will be returned to the pool
                                                                          // task either has not been started yet or will be timed out

                // If something from following will throw an exception,
                // we'll be in non recoverable state
                try {
                  worker.onTaskResult(this._handleTaskResult.bind(this, task.id, worker));
                  if (resume) {
                    worker.resume(updatedTask);
                  } else {
                    worker.start(updatedTask);
                  }

                  this._assignedWorkers[updatedTask.id] = worker;
                  this._workerTask[worker.id] = updatedTask.id;
                } catch (e) {
                  this._logger.error(`Unable to assign task ${task.id} to worker`);
                  this._logger.debug(e);

                  // The only thing we can do here, is to terminate worker
                  // task will be timed out
                  worker.terminate();
                }
              })
              .catch((e) => {
                this._logger.error(`Unable to start task ${task.id} handler`);
                this._logger.debug(e);
                this._pool.return(worker);
              });
          } catch (e) {
            this._logger.error(`Unable to start task ${task.id} handler`);
            this._logger.debug(e);
            this._pool.return(worker);
            return this._handleTaskFailed(task.id, 'Unable to schedule')
              .catch((exc) => {
                this._logger.error(`Unable to fail task ${task.id}`);
                this._logger.debug(exc);
              });
          }
          // TODO: ^^^
        });

        this._logger.info(`Run #${runId}: ${promises.length} tasks scheduled.`, {
          topic: 'runTask',
          runId
        });

        return Promise.all(promises);
      })
      .catch((e) => {
        this._logger.error('Exception in _runTasks handler');
        this._logger.debug(e);
      })
      .then(() => {
        const [sec, ns] = process.hrtime(startTs);
        const ms = sec * 1000 + (ns / 1000000);
        this._logger.info(`Run #${runId}: Finishing after ${ms} ms`, {
          topic: 'runTask',
          runId,
          action: 'finishing',
          ms
        });
      })
      .then(this._scheduleNextTick.bind(this));
  }

  registerAppServer(socket) {
    this._logger.info(`Application server connected: ${socket.id}`);
    const appServerDisconnected = (cause) => {
      this._logger.error(`Application server disconnected (${cause}): ${socket.id}`);
    };

    socket.on('disconnect', appServerDisconnected.bind(this, 'disconnect'));
    socket.on('error', appServerDisconnected.bind(this, 'error'));
  }

  registerWorker(socket) {
    this._logger.info(`Worker connected: ${socket.id}`);
    this._subscribeEnqueueHandler(socket);
    this._subscribeGetSubtaskResultsHandler(socket);
    this._subscribeHasWipChildrenHandler(socket);
    this._subscribeGetTaskStartTimeHandler(socket);
    this._subscribeReportQuotaHandler(socket);
    this._subscribeDropAllCompletedChildrenHandler(socket);
    this._subscribeClearModifiedFlagHandler(socket);
    const worker = new Worker(socket, this._logger);
    this._pool.add(worker);

    const workerDisconnected = (cause) => {
      this._logger.info(`Worker disconnected (${cause}): ${socket.id}`);
      const taskId = this._workerTask[worker.id];
      if (!taskId) { return; }
      this._logger.debug(`Worker was working on task #${taskId}`);

      delete this._workerTask[worker.id];
      if (this._assignedWorkers[taskId]) {
        delete this._assignedWorkers[taskId];
      }

      this._handleTaskFailed(taskId, `Worker disconnected (${cause})`)
        .catch(e => {
          this._logger.error(`Error while handling task (${taskId}) failure.`);
          this._logger.error(e.message);
          this._logger.debug(e);
        });
    };

    socket.on('disconnect', workerDisconnected.bind(this, 'disconnect'));
    socket.on('error', workerDisconnected.bind(this, 'error'));
  }

  async initRabbit() {
    if (this._config.rabbitmq) {
      if (!this._config.rabbitmq.mock) {
        this._rabbitClient = await RabbitClient(this._config.rabbitmq.uri, this._logger, this);
      }
    } else {
      throw new Error(`RabbitMq not configured [${this._config.rabbitmq}]`);
    }
  }

  async init() {
    this._logger.info('Initializing Manager application with configuration: ' + JSON.stringify(this._config, undefined, 2));
    await this.initRabbit();
    return this._taskQueue.init()
      .then(() => {
        const suspendedTasks = this._taskQueue.getAllSuspendedTasks();
        if (!suspendedTasks.length) { return undefined; } // nothing to do

        this._logger.info(`Recheck ${suspendedTasks.length} suspended tasks`);

        // This should be done one-by-one, if you'll decide to refactor this
        // Please verify your code against real Etsy with real shops
        const promise = _.reduce(suspendedTasks, (result, task) => {
          return result.then(this._checkParentIsDone.bind(this, task.id));
        }, Promise.resolve());

        return promise;
      })
      .then(this._scheduleNextTick.bind(this));
  }

  static CHECK_INTERVAL = 1 * 1000; // Check for available tasks interval
  static TASK_EXECUTION_TIMEOUT = 5 * 60 * 1000; // 5 Minutes to finish task (for pretty big shops)
  static TASK_SUSPENSION_TIMEOUT = 3 * 60 * 60 * 1000; // 3 Hours to finish all descendant tasks
  static MAX_RETRY_COUNT = 1; // 1 retry except initial try
}
