import Promise from 'bluebird';
import _ from 'lodash';

import { WORKER, MANAGER, OPERATIONS } from '../../constants';

function callHandlers(handlers) {
  const args = Array.prototype.slice.call(arguments, 1);
  _.each(handlers, (handler) => {
    const f = Function.prototype.apply.bind(handler, null, args);
    setImmediate(f);
  });
}

function logSocketEvent(socket, logger, evName) {
  socket.on(evName, () => { logger.info(`Socket Event "${evName}" occurred.  Socket id: ${socket.id}`); });
}

export default class Client {
  constructor(socket, logger) {
    this._socket = socket;
    this._logger = logger;

    this._startTaskHandlers = [];
    this._resumeTaskHandlers = [];
    this._disconnectHandlers = [];

    ['connect', 'connect_error', 'connect_timeout', 'error', 'disconnect',
      'reconnect', 'reconnect_attempt', 'reconnecting', 'reconnect_error',
      'reconnect_failed']
    .forEach((ev) => { logSocketEvent(socket, logger, ev); });

    socket.on(WORKER.TASK_OPERATIONS.START, callHandlers.bind(null, this._startTaskHandlers));
    socket.on(WORKER.TASK_OPERATIONS.RESUME, callHandlers.bind(null, this._resumeTaskHandlers));
    socket.on('disconnect', callHandlers.bind(null, this._disconnectHandlers));
  }

  onStartTask(handler) {
    this._startTaskHandlers.push(handler);
  }

  onResumeTask(handler) {
    this._resumeTaskHandlers.push(handler);
  }

  onDisconnect(handler) {
    this._disconnectHandlers.push(handler);
  }

  _enqueueOperation(companyId, channelId, operation, operationData, parentTaskId) {
    this._logger.debug(`Enqueue task: {${companyId}, ${channelId}, ${operation}, ${operationData}}`);
    return new Promise((resolve, reject) => {
      const task = { companyId, channelId, operation, operationData };
      if (parentTaskId) {
        task.parentTaskId = parentTaskId;
      }

      this._socket.emit(MANAGER.TASK_OPERATIONS.ENQUEUE, task, (response) => {
        if (response.result === MANAGER.TASK_RESULTS.SUCCEEDED) {
          this._logger.debug(`Manager::_enqueueOperation({${companyId}, ${channelId}, ${operation}, ${operationData}}) successfully finished`);
          resolve();
        } else {
          this._logger.error(`Manager::_enqueueOperation({${companyId}, ${channelId}, ${operation}, ${operationData}}) failed: `, response);
          reject(new Error(response.cause));
        }
      });
    });
  }

  enqueueImageUpload(companyId, channelId, imageId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.UPLOAD_IMAGE, imageId, parentTaskId);
  }

  enqueueImageDelete(companyId, channelId, imageId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.DELETE_IMAGE, imageId, parentTaskId);
  }

  enqueueCreateSection(companyId, channelId, shopId, sectionId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.CREATE_SECTION, JSON.stringify({ shopId, sectionId }), parentTaskId);
  }

  enqueueRearrangeImages(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.REARRANGE_IMAGES, productId, parentTaskId);
  }

  enqueueAttributeUpdate(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.UPDATE_ATTRIBUTE, productId, parentTaskId);
  }

  enqueueAttributeDelete(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.DELETE_ATTRIBUTE, productId, parentTaskId);
  }

  // Enqueue product upload
  // productId can be id of single product or array of product ids
  enqueueProductUpload(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.UPLOAD_PRODUCT, productId, parentTaskId);
  }

  // update the fields of a single product ID
  enqueueProductFieldsUpload(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.UPLOAD_PRODUCT_FIELDS, productId, parentTaskId);
  }

  // update/overwrite the productOfferings of a single product ID
  enqueueProductOfferingsUpload(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.UPLOAD_PRODUCT_OFFERINGS, productId, parentTaskId);
  }

  // Enqueue product download
  // productId can be id of single product or array of product ids
  enqueueProductDownload(companyId, channelId, productId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.DOWNLOAD_PRODUCT, productId, parentTaskId);
  }

  enqueueShopSync(companyId, channelId, shopId, parentTaskId) {
    return this._enqueueOperation(companyId, channelId, OPERATIONS.SYNC_SHOP, shopId, parentTaskId);
  }

  taskResult(taskId, requestsInfo, result, data) {
    this._logger.debug(`Manager::taskResult(${taskId}, ${result}, ${data})`);
    this._socket.emit(MANAGER.TASK_OPERATIONS.RESULT, {taskId, result, data, requests: requestsInfo});
  }

  getTaskStartTime(taskId) {
    this._logger.debug(`Manager::getTaskStartTime(${taskId})`);
    return this._emitOperation(taskId, MANAGER.TASK_OPERATIONS.GET_TASK_START_TIME);
  }

  reportQuota(taskId, quotaInfo) {
    this._logger.debug(`Manager::reportQuota(${taskId}, ${JSON.stringify(quotaInfo)})`);
    this._socket.emit(MANAGER.TASK_OPERATIONS.REPORT_QUOTA, {taskId, ...quotaInfo});
  }

  getSubtaskResults(taskId) {
    this._logger.debug(`Manager::getSubtaskResults(${taskId})`);
    return this._emitOperation(taskId, MANAGER.TASK_OPERATIONS.GET_SUBTASK_RESULTS);
  }

  hasWipChildren(taskId) {
    this._logger.debug(`Manager::hasWipChildren(${taskId})`);
    return this._emitOperation(taskId, MANAGER.TASK_OPERATIONS.HAS_WIP_SUBTASKS);
  }

  dropAllCompletedChildren(taskId) {
    this._logger.debug(`Manager::dropAllCompletedChildren(${taskId})`);
    return this._emitOperation(taskId, MANAGER.TASK_OPERATIONS.DROP_ALL_COMPLETED_CHILDREN);
  }

  markTaskNotModified(taskId) {
    this._logger.debug(`Manager::markTaskNotModified(${taskId})`);
    return this._emitOperation(taskId, MANAGER.TASK_OPERATIONS.CLEAR_MODIFIED_FLAG);
  }

  _emitOperation(taskId, op) {
    return new Promise((resolve, reject) => {
      this._socket.emit(op, {taskId}, (response) => {
        if (response.result === MANAGER.TASK_RESULTS.SUCCEEDED) {
          resolve(response.data);
        } else {
          reject(new Error(response.cause));
        }
      });
    });
  }
}
