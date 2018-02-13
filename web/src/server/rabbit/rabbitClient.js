import Promise from 'bluebird';
import _ from 'lodash';
import AmqpConnect from '../../../../shared/modules/amqp/amqpConnect';
import { QUEUES, EXCHANGES, OPERATIONS } from '../../../../shared/constants';

export default async (uri, logger) => {
  async function enqueueOperation(amqp, companyId, channelId, operation, operationData, parentTaskId, dbName) {
    logger.debug(`Enqueue task: {${companyId}, ${channelId}, ${operation}, ${operationData}`);
    const task = { companyId, channelId, operation, operationData };
    if (parentTaskId) {
      task.parentTaskId = parentTaskId;
    }

    try {
      await amqp.publish(EXCHANGES.MANAGER_TASKS, dbName, task);
      logger.debug(`push to ${QUEUES.MANAGER_TASKS} for {${companyId}, ${channelId}, ${operation}, ${operationData}} successfully finished`);
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: 'Unable to enqueue operation',
        companyId: companyId,
        channelId: channelId,
        operation: operation,
        operationData: operationData,
        error: e
      });
    }
    return Promise.resolve();
  }

  function enqueueShopSyncEtsy(amqp, companyId, channelId, shopId, dbName) {
    return enqueueOperation(amqp, companyId, channelId, OPERATIONS.SYNC_SHOP, shopId, null, dbName);
  }

  async function enqueueShopSync(amqp, userId, shopId, channelName) {
    try {
      const message = {
        headers: {
          type: `${channelName}.syncShop`,
          userId: userId,
          shopId: shopId
        },
        body: {
          triggeredByUser: true
        }
      };
      await amqp.publish(EXCHANGES.COMMANDS, 'syncShop', message);
      logger.debug(`published in ${EXCHANGES.COMMANDS} for {${userId} ${shopId}} successfully finished`);
      return Promise.resolve();
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        message: 'Unable to enqueue apply operations',
        userId: userId,
        shopId: shopId,
        error: e
      });
      return Promise.reject(e);
    }
  }

  function enqueueImageUpload(amqp, companyId, channelId, imageId, parentTaskId) {
    return enqueueOperation(amqp, companyId, channelId, OPERATIONS.UPLOAD_IMAGE, imageId, parentTaskId);
  }

  function enqueueImageDelete(amqp, companyId, channelId, imageId, parentTaskId) {
    return enqueueOperation(amqp, companyId, channelId, OPERATIONS.DELETE_IMAGE, imageId, parentTaskId);
  }

  async function enqueueApplyOpsEtsy(amqp, companyId, channelId, shopId, operations, dbName) {
    try {
      await amqp.publish(EXCHANGES.APPLY_OPERATIONS, dbName, { shopId, operations });
      logger.debug(`published in ${EXCHANGES.APPLY_OPERATIONS} for {${companyId}, ${channelId} ${shopId}, ${operations}, ${dbName}} successfully finished`);
      return Promise.resolve();
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        message: 'Unable to enqueue apply operations',
        companyId: companyId,
        channelId: channelId,
        shopId: shopId,
        operation: operations,
        error: e
      });
      return Promise.reject(e);
    }
  }

  async function enqueueApplyOps(amqp, userId, shopId, channelName, operations) {
    const message = {
      headers: {
        type: `${channelName}.applyOperationsSplitter`,
        userId: userId,
        shopId: shopId
      },
      stack: [],
      body: {
        operations: operations
      }
    };

    try {
      await amqp.publish(EXCHANGES.COMMANDS, 'applyOperationsSplitter', message);
      logger.debug(`published in ${EXCHANGES.COMMANDS} for {${shopId}, ${operations}} successfully finished`);
      return Promise.resolve();
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        message: 'Unable to enqueue apply operations',
        shopId: shopId,
        operation: operations,
        error: e
      });
      return Promise.reject(e);
    }
  }

  try {
    const amqp = await AmqpConnect(uri, logger, undefined, {reconnect: false});

    return {
      enqueueShopSyncEtsy: _.partial(enqueueShopSyncEtsy, amqp),
      enqueueShopSync: _.partial(enqueueShopSync, amqp),
      enqueueImageUpload: _.partial(enqueueImageUpload, amqp),
      enqueueImageDelete: _.partial(enqueueImageDelete, amqp),
      enqueueApplyOpsEtsy: _.partial(enqueueApplyOpsEtsy, amqp),
      enqueueApplyOps: _.partial(enqueueApplyOps, amqp)
    };
  } catch (e) {
    throw e;
  }
};
