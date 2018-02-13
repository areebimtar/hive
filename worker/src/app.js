import Promise from 'bluebird';
import _ from 'lodash';

// import Models from 'global/db/models'; // TODO: Uncomment this when babel6 issue will be solved
// import logger from 'app/logger'; // TODO: Uncomment this when babel6 issue will be solved

import * as operationHandlers from './operationHandlers';
import RateLimiter from './rateLimiter';
import RabbitClient from './rabbit/rabbitClient';
import { SHOP_SYNC_IN_VACATION_MODE } from '../../shared/db/models/constants';

import applyBulkOperations from './operationHandlers/applyBulkOperations';

// import from 'global/constants'; // TODO: Uncomment this when babel6 issue will be solved
import { WORKER, SHOP_SYNC_INTERVAL as GLOBAL_SHOP_SYNC_INTERVAL } from '../../shared/constants';
import { CHANNEL } from 'global/constants';

import moment from 'moment';

export default class App {
  constructor(db, Models, config, manager, logger) {
    logger.debug('App::constructor');
    this._db = db;
    this._config = config;
    this._models = Models(db);
    this._logger = logger; // TODO: Remove this when babel6 issue will be solved
    this._manager = manager;
    // register tash handlers comming in via sockets
    if (this._manager) {
      this._manager.onStartTask((task) => {
        this._startTask(task.id, task.operation, task.operationData, task.createdAt);
      });
      this._manager.onResumeTask((task) => {
        this._resumeTask(task.id, task.operation, task.operationData, task.suspensionPoint, task.modified, task.createdAt);
      });
    }
  }

  _logTimeInQueue(taskId, operation, createdAt, failed) {
    if (!createdAt) {
      return null;
    }
    const now = moment();
    const startTime = moment(createdAt);
    const secondsInQueue = now.diff(startTime, 'seconds');
    this._logger.info({
      topic: 'taskCompletion',
      seconds: secondsInQueue,
      operation: operation,
      taskId: taskId,
      result: failed ? 'FAILED' : 'SUCCEEDED'
    });
    return undefined;
  }

  _handleTaskError(taskId, requests, e, operation, createdAt) {
    this._logTimeInQueue(taskId, operation, createdAt, true);
    this._logger.error(`Task #${taskId} failed.`);
    this._logger.error(e.message);
    this._logger.debug(e);
    this._manager.taskResult(taskId, requests, WORKER.TASK_RESULTS.FAILED, e.message);
  }

  _getOperationHandler(operation) {
    const handler = operationHandlers[operation];
    if (!handler) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    return handler;
  }

  _handleTaskResult(taskId, requests, result, operation, createdAt) {
    this._logger.debug('Operation done');
    this._logger.debug(result);
    if (result.result === WORKER.TASK_RESULTS.SUCCEEDED) {
      this._logTimeInQueue(taskId, operation, createdAt);
      this._manager.taskResult(taskId, requests, result.result, result.message);
    } else if (result.result === WORKER.TASK_RESULTS.SUSPENDED) {
      this._logger.debug(`Suspend task, suspension point: ${result.suspensionPoint}`);
      this._manager.taskResult(taskId, requests, result.result, result.suspensionPoint);
    } else if (result.result === WORKER.TASK_RESULTS.ABORTED) {
      this._logger.debug('Task was aborted');
      this._manager.taskResult(taskId, requests, result.result);
    } else {
      this._logger.error('Operation handler has returned unknown result');
      this._logger.error(result);
      this._manager.taskResult(taskId, requests, result.result, 'Operation handler has returned unknown result');
    }
  }

  _resumeTask(taskId, operation, operationData, suspensionPoint, wasModified, createdAt) {
    this._logger.debug(`App::resumeTask(${taskId}, ${operation})`);

    const requests = {
      requestsMade: 0
    };

    try {
      const operationHandler = this._getOperationHandler(operation);
      const rateLimiter = new RateLimiter(this._manager, taskId);
      operationHandler.resume(this._config, this._models, this._logger, operationData, suspensionPoint, wasModified, taskId, this._manager, requests, rateLimiter)
        .then((result) => this._handleTaskResult(taskId, requests, result, operation, createdAt))
        .catch((e) => this._handleTaskError(taskId, requests, e, operation, createdAt));
    } catch (e) {
      this._handleTaskError(taskId, requests, e, operation, createdAt);
    }
  }

  _startTask(taskId, operation, operationData, createdAt) {
    this._logger.debug(`App::startTask(${taskId}, ${operation})`);
    const requests = {
      requestsMade: 0
    };

    try {
      const operationHandler = this._getOperationHandler(operation);
      const rateLimiter = new RateLimiter(this._manager, taskId);
      operationHandler.start(this._config, this._models, this._logger, operationData, taskId, this._manager, requests, rateLimiter)
        .then((result) => this._handleTaskResult(taskId, requests, result, operation, createdAt))
        .catch((e) => this._handleTaskError(taskId, requests, e, operation, createdAt));
    } catch (e) {
      this._handleTaskError(taskId, requests, e, operation, createdAt);
    }
  }

  _shouldNotSync(shop) {
    return shop.invalid && shop.sync_status !== SHOP_SYNC_IN_VACATION_MODE;
  }

  async _syncShops() {
    this._logger.debug('Check shops for sync');
    try {
      const shopsForSync = await this._models.compositeRequests.getShopsToSync(App.SHOP_SYNC_INTERVAL, this._config.etsy.maxShopsPerCheckShopSync, CHANNEL.ETSY);

      const accountIds = _.map(shopsForSync, 'account_id');
      const accounts = await this._models.accounts.getByIds(accountIds);
      const accountsMap = _.reduce(accounts, (map, account) => _.set(map, account.id, account), {});

      await Promise.map(shopsForSync, (shop) => {
        this._logger.info(`Schedule sync for shop #${shop.id}`);
        const account = accountsMap[shop.account_id];
        // enqueue using rabbit
        return this._rabbitClient.enqueueShopSync(parseInt(account.company_id, 10), parseInt(account.channel_id, 10), shop.id);
      });
    } catch (error) {
      this._logger.error('Exception in _syncShops handler');
      this._logger.debug(error);
    }
  }

  async _applyOperations(message) {
    this._logger.debug('Apply bulk operations');

    if (!this._rabbitClient) {
      return WORKER.TASK_RESULTS.BLOCKED;
    }

    try {
      const result = await applyBulkOperations(this._config, this._models, this._logger, message, this._rabbitClient);
      return result;
    } catch (e) {
      this._logger.error('Exception in _applyOperations handler', { exception: e, data: message });
      return WORKER.TASK_RESULTS.FAILED;
    }
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
    this._logger.info('Initializing Worker application with configuration: ' + JSON.stringify(this._config, undefined, 2));
    await this.initRabbit();
  }

  static SHOP_SYNC_INTERVAL = GLOBAL_SHOP_SYNC_INTERVAL; // Shop auto sync interval 6 hours
}
