import Promise from 'bluebird';
import _ from 'lodash';
import AmqpConnect from '../../../shared/modules/amqp/amqpConnect';
import { QUEUES, OPERATIONS } from '../../../shared/constants';
import { WORKER } from 'global/constants';

const MESSAGES = {
  CHECK_SHOP_SYNC: `${QUEUES.CHECK_SHOP_SYNC} token received`,
  SUBSCRIBE_TOKENS: `${QUEUES.CHECK_SHOP_SYNC} subscribed`,
  FAILED_SUBSCRIBE_TOKENS: `Failed to subscribe ${QUEUES.CHECK_SHOP_SYNC}`,
  APPLY_OPERATIONS_TOKEN_RECEIVED: `${QUEUES.APPLY_OPERATIONS} token received`,
  APPLY_OPERATIONS_SUBSCRIBE: `${QUEUES.APPLY_OPERATIONS} subscribed`,
  APPLY_OPERATIONS_SUBSCRIBE_FAILED: `Failed to subscribe ${QUEUES.APPLY_OPERATIONS}`
};

export default async (uri, logger, app) => {
  const config = app._config;

  function getPrefixedQueueName(queueName) {
    const dbName = config.db.name;
    if (!dbName) { return queueName; }

    return `${dbName}.${queueName}`;
  }

  async function enqueueOperation(amqp, companyId, channelId, operation, operationData, parentTaskId) {
    logger.debug(`Enqueue task: {${companyId}, ${channelId}, ${operation}, ${operationData}`);
    const task = { companyId, channelId, operation, operationData };
    if (parentTaskId) {
      task.parentTaskId = parentTaskId;
    }

    try {
      await amqp.push(getPrefixedQueueName(QUEUES.MANAGER_TASKS), task);
      logger.debug(`push to ${QUEUES.MANAGER_TASKS} for {${companyId}, ${channelId}, ${operation}, ${operationData}} successfully finished`);
      return Promise.resolve();
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
      return Promise.reject(e);
    }
  }

  function enqueueShopSync(amqp, companyId, channelId, shopId) {
    return enqueueOperation(amqp, companyId, channelId, OPERATIONS.SYNC_SHOP, shopId);
  }

  async function checkShopSync(message) {
    logger.info({
      topic: 'rabbit',
      event: 'checkShopSync',
      details: MESSAGES.CHECK_SHOP_SYNC
    });
    await app._syncShops();
    return message.sendToDelay();
  }

  async function applyOperations(message) {
    logger.info({
      topic: 'rabbit',
      details: MESSAGES.APPLY_OPERATIONS_TOKEN_RECEIVED
    });

    const result = await app._applyOperations(message.content);
    if (result === WORKER.TASK_RESULTS.BLOCKED) {
      // we are blocked by running sync shop operation, nack message. it will be dead lettered into wait queue
      message.deadletter();
      return;
    }

    message.ack();
  }

  async function subscribeCheckShopSync(checkShopSyncHandler, amqp) {
    try {
      await amqp.subscribeTokens(getPrefixedQueueName(QUEUES.CHECK_SHOP_SYNC), checkShopSyncHandler);
      logger.info({
        topic: 'rabbit',
        event: 'subscribeTokens',
        details: MESSAGES.SUBSCRIBE_TOKENS
      });
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: MESSAGES.FAILED_SUBSCRIBE_TOKENS,
        error: e
      });
      throw e;
    }
  }

  async function subscribeApplyOperations(checkShopSyncHandler, amqp) {
    try {
      const queue = app._config.applyOperationsQueue || QUEUES.APPLY_OPERATIONS;
      await amqp.subscribe(getPrefixedQueueName(queue), checkShopSyncHandler);
      logger.info({
        topic: 'rabbit',
        event: 'subscribe',
        details: MESSAGES.APPLY_OPERATIONS_SUBSCRIBE
      });
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: MESSAGES.APPLY_OPERATIONS_SUBSCRIBE_FAILED,
        error: e
      });
      throw e;
    }
  }

  const handlers = [];
  // register worker for shop sync via rabbit
  if (_.get(config, 'roles.syncShops', true)) {
    handlers.push(_.partial(subscribeCheckShopSync, checkShopSync));
  }

  // register worker to handle apply operations tasks
  if (_.get(config, 'roles.applyOperations', true)) {
    handlers.push(_.partial(subscribeApplyOperations, applyOperations));
  }

  const amqp = await AmqpConnect(uri, logger, handlers);
  return {
    enqueueShopSync: _.partial(enqueueShopSync, amqp)
  };
};
