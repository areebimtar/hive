import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';
import { TASK } from '../constants';
import { OPERATIONS } from '../../../shared/constants';

import QuotaLimit from './quotaLimit';

import TasksQueueModel from '../db/models/tasksQueue';

function cloneTask(task) {
  if (!task) { return task; }

  const clonedTask = _.cloneDeep(task);
  if (task.createdAt) { clonedTask.createdAt = moment(task.createdAt); }
  if (task.stateExpiresAt) { clonedTask.stateExpiresAt = moment(task.stateExpiresAt); }

  return clonedTask;
}

export default class TasksQueue {
  constructor(db, config, logger) {
    this._db = db;
    this._dbModel = new TasksQueueModel(db);
    this._initialized = false;
    this._logger = logger; // TODO: Remove this when babel6 issues will be solved
    this._queueIndex = {};
    this._queues = [];
    this._taskIndex = {};
    this._config = config;
    this._quotaLimit = new QuotaLimit(config.manager.dailyQuotaReserve);
  }

  _updateQueueNextTryTime(queue) {
    queue.nextTryTime = moment().add(1, 'hours').startOf('hour');
    this._logger.info(`Quota exhausted for queue '${queue.id}', next try will be done at ${queue.nextTryTime.format('HH:mm:ss')}`);
    this._logger.debug(`${queue.quotaRemaining}/${queue.quotaDailyLimit} (Remaining/Daily limit). Our reserve: ${this._quotaLimit.getReservedNumberOfCallsForQueue(queue)}`);
  }

  _getQueue(task) {
    let queueId = undefined;

    if (task.queueId) { // if we have `queueId` set for task, use it
      queueId = task.queueId;
    } else if (_.isFinite(task.parentTaskId)) { // if we have parent task, take its `queueId`
      const parentTask = this.getTaskById(task.parentTaskId);
      if (!parentTask) {
        throw new Error(`Unable to get queue, parent task #${task.parentTaskId} not found for task #${task.id}`);
      }
      queueId = parentTask.queueId;
    } else { // construct queue id from company id and channel id and shop id
      const shopId = (task.operation === OPERATIONS.SYNC_SHOP) ? task.operationData : '';
      queueId = `${task.companyId}_${task.channelId}_${shopId}`;
    }

    if (!this._queueIndex[queueId]) {
      const queue = {
        quotaDailyLimit: TasksQueue.DAILY_QUOTA,
        quotaRemaining: TasksQueue.DAILY_QUOTA,
        tasksActive: 0,
        rateLimitExhaustedReported: false,
        tasks: [],
        id: queueId
      };

      this._queueIndex[queueId] = queue;
      this._queues.push(queue);
    }

    return this._getQueueById(queueId);
  }

  _getQueueById(id) {
    return this._queueIndex[id];
  }

  _addTaskToQueue(task, _queue) {
    const queue = _queue || this._getQueue(task);
    task.queueId = queue.id;

    queue.tasks.push(task);
    this._taskIndex[task.id] = task;
    this._logger.debug(`Task #${task.id} was queued to queue ${queue.id}`);
  }

  _removeTaskFromQueue(task) {
    this._logger.debug('Remove task from queue:', task);
    delete this._taskIndex[task.id];

    const queue = this._getQueue(task);
    const taskIndex = _.findIndex(queue.tasks, {id: task.id});
    queue.tasks.splice(taskIndex, 1);
  }

  init() {
    if (this._initialized) { return true; }
    return this._dbModel.getAllUnfinishedTasks()
      .then((tasks) => {
        this._logger.info('Load tasks');
        _.each(tasks, (dbTask) => {
          try {
            const task = {
              id: parseInt(dbTask.id, 10),
              companyId: parseInt(dbTask.company_id, 10),
              channelId: parseInt(dbTask.channel_id, 10),
              operation: dbTask.operation,
              operationData: dbTask.operation_data,
              createdAt: moment(dbTask.created_at),
              state: dbTask.state || undefined,
              stateExpiresAt: dbTask.state_expires_at ? moment(dbTask.state_expires_at) : undefined,
              parentTaskId: dbTask.parent_id ? parseInt(dbTask.parent_id, 10) : undefined,
              retry: dbTask.retry ? parseInt(dbTask.retry, 10) : 0,
              suspensionPoint: dbTask.suspension_point || undefined,
              modified: dbTask.modified || false,
              ttl: 0
            };

            this._logger.debug(task);

            this._addTaskToQueue(task);
          } catch (e) {
            this._logger.error(`[${dbTask.id}] - unable to add task to queue`);
            this._logger.error(e);
            this._logger.debug(dbTask);
          }
        });
      })
      .then(() => {
        this._initialized = true;
      });
  }

  _setTaskState(taskId, state, ttl, suspensionPoint, result) {
    const task = this._taskIndex[taskId];
    if (!task) {
      this._logger.debug(`Task not found: ${taskId}`);
      this._logger.debug(this._taskIndex);
      return Promise.reject(new Error(`Task not found: ${taskId}`));
    }

    // change its status to assigned
    task.state = state;
    if (_.isString(suspensionPoint)) {
      task.suspensionPoint = suspensionPoint;
    }
    if (ttl !== undefined) {
      task.stateExpiresAt = moment().add(ttl, 'milliseconds');
      task.ttl = ttl;
    } else {
      task.stateExpiresAt = undefined;
    }

    // update task in db
    return this._dbModel.setTaskState(task.id, state, ttl, suspensionPoint, result);
  }

  enqueue(companyId, channelId, operation, operationData, parentTaskId) {
    this._logger.debug(`TaskQueue#enqueue(${companyId}, ${channelId}, ${operation}, ${operationData}, ${parentTaskId})`);

    if (_.isFinite(parentTaskId) && !this._taskIndex[parentTaskId]) {
      this._logger.debug(`Parent task #${parentTaskId} has not been found`);
      return Promise.reject(new Error(`Parent task #${parentTaskId} has not been found`));
    }

    if (!_.isFinite(companyId)) {
      return Promise.reject(new Error(`Invalid companyId parameter to TaskQueue#enqueue(${companyId}, ${channelId}, ${operation}, ${operationData})`));
    }

    if (!_.isFinite(channelId)) {
      return Promise.reject(new Error(`Invalid channelId parameter to TaskQueue#enqueue(${companyId}, ${channelId}, ${operation}, ${operationData})`));
    }

    if (!_.isString(operation)) {
      return Promise.reject(new Error(`Invalid operation parameter to TaskQueue#enqueue(${companyId}, ${channelId}, ${operation}, ${operationData})`));
    }

    const operationDataArray = [].concat(operationData);
    return Promise.map(operationDataArray, (_data) => {
      const data = _.isObject(_data) ? JSON.stringify(_data) : _data;
      // Skip already existing tasks
      const query = {companyId, channelId, operation, operationData: data };
      if (parentTaskId) {
        query.parentTaskId = parentTaskId;
      }

      const task = {
        parentTaskId,
        retry: 0,
        companyId, channelId, operation,
        operationData: data
      };

      const queue = this._getQueue(task);

      const existingTask = _.find(queue.tasks, query);
      if (existingTask) {
        this._logger.debug(`Task [${operation}, ${companyId}, ${channelId}] has already been enqueued`);
        existingTask.modified = true;
        existingTask.retry = 0; // Reset retry count for modified task
        return this._dbModel.markTaskModified(existingTask.id)
          .then(() => { return existingTask.id; });
      }

      return this._dbModel.enqueueTask(parentTaskId, 0, undefined, companyId, channelId, operation, data)
        .then((taskId) => {
          task.id = parseInt(taskId, 10);
          task.createdAt = moment();

          this._addTaskToQueue(task, queue);
          return taskId;
        });
    });
  }

  // ttl in milliseconds
  startTask(taskId, ttl) {
    const task = this.getTaskById(taskId);
    const queue = this._getQueue(task);
    queue.tasksActive++;
    return this._setTaskState(taskId, TASK.STATE.STARTED, ttl)
      .catch((e) => {
        queue.tasksActive--;
        throw e;
      });
  }

  retryTask(taskId, reason) {
    this._logger.debug(`Retry task #${taskId}: ${reason}`);
    const task = this._taskIndex[taskId];
    task.retry++;

    const queue = this._getQueue(task);
    queue.tasksActive--;

    return this._removeTaskWithPurging(task, queue, false).then(() => {
      return this._db.tx((t) => {
        // update task in db
        const promise1 = this._dbModel.setTaskState(task.id, TASK.STATE.FAILED, undefined, undefined, reason, t);
        const promise2 = this._dbModel.enqueueTask(task.parentTaskId, task.retry, undefined /* suspensionPoint */, task.companyId, task.channelId, task.operation, task.operationData, t)
          .then((newTaskId) => {
            task.state = undefined;
            task.stateExpiresAt = undefined;
            task.result = undefined;
            task.suspensionPoint = undefined;
            task.modified = false;
            task.id = parseInt(newTaskId, 10);
            task.createdAt = moment();

            this._logger.debug(`Retry task #${taskId} replaced by task #${task.id}`);
          });

        return t.batch([promise1, promise2]);
      });
    })
    .catch((e) => {
      this._logger.error(`Unexpected error happened during 'retryTask': ${e.message}`);
      this._logger.error(e);
      task.state = TASK.STATE.FAILED; // Mark task as failed
    })
    .then(() => {
      // Put task back to the queue
      // NOTE: If something will go wrong in transaction ^^^ task may be stored in queue as is
      // (old task id, old createdAt, but with incremented retryCount and state set to 'FAILED')
      this._addTaskToQueue(task);
    });
  }

  pauseTask(taskId, suspensionPoint, ttl) {
    const task = this.getTaskById(taskId);
    if (!task) { return Promise.reject(new Error(`Task ${taskId} not found.`)); }
    if (task.state !== TASK.STATE.STARTED) { return Promise.reject(new Error(`Task ${taskId} has not been started yet (state: ${task.state}).`)); }

    const queue = this._getQueue(task);
    queue.tasksActive--;

    return this._setTaskState(taskId, TASK.STATE.SUSPENDED, ttl, suspensionPoint);
  }

  resumeTask(taskId, ttl) {
    const task = this.getTaskById(taskId);
    if (!task) { return Promise.reject(new Error(`Task ${taskId} not found.`)); }
    if (task.state === TASK.STATE.RESUMED) {
      this._logger.error(`Task ${taskId} is in resumed state but should have been suspended (most likely race condition on finished subtasks). Doing nothing`);
      return Promise.resolve();
    }
    if (task.state !== TASK.STATE.SUSPENDED) { return Promise.reject(new Error(`Task ${taskId} has not been suspended yet (state: ${task.state}).`)); }
    // Do not increase queue active tasks counter. it will be increased when task will be started

    return this._setTaskState(taskId, TASK.STATE.RESUMED, ttl);
  }

  finishTask(taskId, result, succeeded = true, forceDelete = false) {
    this._logger.debug(`finishTask(${taskId}, ${succeeded})`);

    const task = this._taskIndex[taskId];
    if (!task) { return Promise.reject(new Error(`Task ${taskId} not found.`)); }

    const queue = this._getQueue(task);
    queue.tasksActive--;

    return this._setTaskState(taskId, succeeded ? TASK.STATE.DONE : TASK.STATE.FAILED, undefined, undefined, result)
      .then(() => {
        if ((task.parentTaskId !== undefined) && (!forceDelete)) {
          this._logger.debug(`Keep task #${taskId} in queue, until its parent task #${task.parentTaskId} will be done`);
          return undefined;
        }

        return this._removeTaskWithPurging(task, queue, succeeded);
      });
  }

  abortTask(taskId, result) {
    this._logger.debug(`abortTask(${taskId})`);

    const task = this._taskIndex[taskId];
    if (!task) { return Promise.reject(new Error(`Task ${taskId} not found.`)); }

    const queue = this._getQueue(task);
    queue.tasksActive--;

    return this._setTaskState(taskId, TASK.STATE.ABORTED, undefined, undefined, result)
      .then(() => {
        if (task.parentTaskId !== undefined) {
          this._logger.debug(`Keep task #${taskId} in queue, until its parent task #${task.parentTaskId} will be done`);
          return undefined;
        }

        return this._removeTaskWithPurging(task, queue, true);
      });
  }

  /**
   * Helper method to remove task from queue. This method is simple wrapper around @_removeTaskFromQueue but it also
   * cleans the whole queue in case the removed task is top-level syncShop. If the syncShop failed it will also explicitly
   * set state of all tasks to FAILED in database.
   *
   * @param task - task to be removed
   * @param queue - queue corresponding to the given task
   * @param succeded - false if task failed (the children will then be marked as failed in DB)
   * @returns {Promise} Promise.all of db updates to fail all tasks (promise resolved with undefined in case no update is necessary)
   * @private
   */
  async _removeTaskWithPurging(task, queue, succeded) {
    if (task.parentTaskId !== undefined) { // not top-level task
      this._removeTaskFromQueue(task);
      return undefined;
    }

    if (task.operation !== OPERATIONS.SYNC_SHOP) {
      this._logger.error('Removing top-level task that is not syncShop', task);
      this._removeTaskFromQueue(task);
      return undefined;
    }

    this._logger.info(`Removing sync shop, purging queue '${queue.id}'`, { task, topic: 'purgeQueue'});
    if (succeded) {
      this._purgeQueue(queue);
      return undefined;
    }

    // the task failed we need to update tasks in DB
    const dbUpdates = _(queue.tasks)
      .filter(({id, state}) => state !== TASK.STATE.FAILED && state !== TASK.STATE.DONE && id !== task.id)
      .map(failedTask => this._dbModel.setTaskState(failedTask.id, TASK.STATE.FAILED, null, null, 'Parent sync shop failed'))
      .value();

    this._purgeQueue(queue);
    return Promise.all(dbUpdates);
  }

  /**
   * Make queue empty. Reclaim all memory taken by tasks on this queue (that is taskIndex and tasks array).
   * All tasks should be finished (either failed or successful) and not referenced from anywhere (assigned to workers etc.).
   */
  _purgeQueue(queue) {
    _.each(queue.tasks, task => delete this._taskIndex[task.id]);
    queue.tasks = [];
    queue.tasksActive = 0;
  }

  consumeQuota(taskId, requestsPerformed) {
    const task = this.getTaskById(taskId);
    if (!task) {
      this._logger.error(`Unable to consume quota for task #${taskId}: task not found`);
      return;
    }

    const queue = this._getQueue(task);
    queue.quotaRemaining -= requestsPerformed;
    if (queue.quotaRemaining % TasksQueue.QUOTA_DUMP_PERIOD === 0) {
      this._logger.info(`Remaining quota: ${queue.quotaRemaining}`);
    }

    if (this._quotaLimit.checkExhausted(queue)) {
      this._updateQueueNextTryTime(queue);
    }
  }

  setQuota(taskId, quotaDailyLimit, quotaRemaining, quotaTimestamp) {
    const task = this.getTaskById(taskId);
    if (!task) {
      this._logger.error(`Unable to set quota value ${quotaRemaining} to task #${taskId}: task not found`);
      return;
    }

    const queue = this._getQueue(task);
    if (!queue) {
      this._logger.error(`Unable to set quota value ${quotaRemaining} to task #${taskId}: queue '${task.queueId}' not found`);
      return;
    }

    if (quotaTimestamp < queue.quotaTimestamp) {
      this._logger.debug(`Will not update quota (from ${queue.quotaRemaining} to ${quotaRemaining}) for task #${taskId}, because more recent quota value has already been set (${quotaTimestamp} < ${queue.quotaTimestamp}).`);
      return;
    }

    const oldRemainder = queue.quotaRemaining % TasksQueue.QUOTA_DUMP_PERIOD;
    queue.quotaRemaining = quotaRemaining;
    queue.quotaTimestamp = quotaTimestamp;
    queue.quotaDailyLimit = quotaDailyLimit;
    const newRemainder = queue.quotaRemaining % TasksQueue.QUOTA_DUMP_PERIOD;

    if ((newRemainder === 0) || (oldRemainder > newRemainder)) {
      this._logger.info(`Queue: ${queue.id}, remaining quota: ${queue.quotaRemaining}`);
    }

    if (this._quotaLimit.checkExhausted(queue)) {
      this._updateQueueNextTryTime(queue);
    }
  }

  _taskIsInProgress(task) {
    return (task.state === undefined) || (task.state === TASK.STATE.STARTED) || (task.state === TASK.STATE.SUSPENDED) || (task.state === TASK.STATE.RESUMED);
  }

  hasTaskChildInProgress(taskId) {
    return _(this._taskIndex).some(task => (task.parentTaskId === taskId) && this._taskIsInProgress(task));
  }

  // Returns all children of `taskId` which are still in progress
  getAllWipChildren(taskId) {
    return _(this._taskIndex)
      .filter((task) => {
        // return all children with state == undefined|started|suspended
        return (task.parentTaskId === taskId) && ((task.state === undefined) || (task.state === TASK.STATE.STARTED) || (task.state === TASK.STATE.SUSPENDED) || (task.state === TASK.STATE.RESUMED));
      })
      .map(cloneTask) // return cloned copies
      .value();
  }

  // Returns all failed children of `taskId`
  getFailedChildren(taskId) {
    return _.map(_.filter(this._taskIndex, {parentTaskId: taskId, state: TASK.STATE.FAILED}), cloneTask);
  }

  getAllChildrenResults(taskId) {
    return _(this._taskIndex)
      .filter({parentTaskId: taskId})
      .map((task) => { return { id: task.id, result: task.state !== TASK.STATE.FAILED, state: task.state }; })
      .map(cloneTask)
      .value();
  }

  dropAllCompletedChildren(taskId) {
    const tasksToDelete = _.filter(this._taskIndex, (task) => {
      return ((task.parentTaskId === taskId) && ((task.state === TASK.STATE.FAILED) || (task.state === TASK.STATE.DONE)));
    });

    _.each(tasksToDelete, this._removeTaskFromQueue.bind(this));
  }

  clearModifiedFlag(taskId) {
    const task = this._taskIndex[taskId];

    if (!task) {
      throw new Error(`Can't find task #${taskId}`);
    }

    task.modified = false;

    return this._dbModel.clearModifiedFlag(taskId);
  }


  getTaskById(taskId) {
    const task = this._taskIndex[taskId];
    return task && cloneTask(task);
  }

  getTaskStartTime(taskId) {
    const task = this._taskIndex[taskId];
    if (!task) {
      throw new Error(`Can't find task #${taskId}`);
    }

    const queue = this._getQueue(task);
    const now = moment();
    const delay = Math.ceil(1000 / this._config.manager.rateLimitPerSecond);

    const lastRequestTime = queue.lastRequestTime && queue.lastRequestTime.clone();

    if (!queue.lastRequestTime || (queue.lastRequestTime.clone().add(delay, 'milliseconds').isBefore(now))) { // last request in past
      queue.lastRequestTime = now;
      task.stateExpiresAt = moment().add(task.ttl, 'milliseconds');
    } else {
      queue.lastRequestTime = queue.lastRequestTime.clone().add(delay, 'milliseconds');
      task.stateExpiresAt = moment().add(task.ttl, 'milliseconds').add(delay, 'milliseconds');
    }

    const msg = lastRequestTime ? `Last request time: ${lastRequestTime.valueOf()} (${queue.lastRequestTime.diff(lastRequestTime)}ms)` : 'There was no previous request';
    this._logger.debug(`getTaskStartTime for ${taskId}(${task.stateExpiresAt.format('YYYY-MM-DD HH:mm:ss')}), queueId: ${queue.id}. Scheduled start time: ${queue.lastRequestTime.valueOf()} (${queue.lastRequestTime.diff(now)}ms from now). ${msg}`);

    return queue.lastRequestTime;
  }

  getTask() {
    let result = undefined;
    const now = moment().startOf('second');
    _.each(this._queues, (queue) => { // iterate through queues until we found first suitable task, use `find` to stop when interesting task found
      if (!queue.tasks || (queue.tasks.length <= 0)) { return true; } // skip empty queues

      const quotaExhausted = this._quotaLimit.checkExhausted(queue);
      if (quotaExhausted && now.isBefore(queue.nextTryTime)) { return true; } // skip queues with exhausted quota

      if (queue.tasksActive >= this._config.manager.rateLimitPerSecond) { // skip queues with exhausted per-second rate limit
        if (!queue.rateLimitExhaustedReported) {
          queue.rateLimitExhaustedReported = true;
          this._logger.debug(`Rate limit exhausted for queue '${queue.id}'`);
        }

        return true;
      }

      queue.rateLimitExhaustedReported = false;

      result = _.find(queue.tasks, (task) => { // go through
        return (task.state === undefined) || (task.state === TASK.STATE.RESUMED);
      });

      if (!!result && quotaExhausted) {
        this._logger.info(`Try whether we have quota relaxed for queue ${queue.id}`);
        queue.nextTryTime = queue.nextTryTime.add(1, 'hours').startOf('hour');
      }

      return !result; // if interesting task found - return false, and stop iterating
    });

    return result && cloneTask(result);
  }

  getAllSuspendedTasks() {
    return _(this._taskIndex)
      .filter({state: TASK.STATE.SUSPENDED })
      .map(cloneTask)
      .value();
  }

  getTimedOutTasks() {
    const now = moment();
    return _(this._taskIndex)
      .filter((task) => { return task.stateExpiresAt && now.isAfter(task.stateExpiresAt); })
      .map(cloneTask)
      .value();
  }

  static DAILY_QUOTA = 1; // Start with 1 request available, so first request will be done, and then
  // either quota value will be obtained or quota will be exceeded
  static QUOTA_DUMP_PERIOD = 5;
}
