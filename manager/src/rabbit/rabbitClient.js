import _ from 'lodash';
import AmqpConnect from '../../../shared/modules/amqp/amqpConnect';
import { QUEUES } from '../../../shared/constants';

const MESSAGES = {
  SUBSCRIBED: `${QUEUES.MANAGER_TASKS} subscribed`,
  FAILED_SUBSCRIBE: `Failed to subscribe ${QUEUES.MANAGER_TASKS}`
};

export default async (uri, logger, app) => {
  const config = app._config;

  function getPrefixedQueueName(queueName) {
    const dbName = config.db.name;
    if (!dbName) { return queueName; }

    return `${dbName}.${queueName}`;
  }

  async function managerTasksHandler(message) {
    logger.debug(`[${QUEUES.MANAGER_TASKS}]`, message);
    try {
      const taskId = await app._enqueue(message.content);
      logger.debug(`Operation(s) has been successfully enqueued, taskId: ${taskId}`);
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: 'Unable to enqueue operation',
        error: e,
        content: message.content
      });
      logger.debug(e);
    }
    try {
      message.ack();
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: 'Unable to ack message',
        content: message.content
      });
    }
  }

  async function subscribeManagerTasks(handler, amqp) {
    try {
      await amqp.subscribe(getPrefixedQueueName(QUEUES.MANAGER_TASKS), handler);
      logger.info({
        topic: 'rabbit',
        event: 'subscribe',
        details: MESSAGES.SUBSCRIBED
      });
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: MESSAGES.FAILED_SUBSCRIBE,
        error: e
      });
      throw e;
    }
  }

  return AmqpConnect(uri, logger, [
    _.partial(subscribeManagerTasks, managerTasksHandler)
  ], { assertPrecreatedQueues: true, deletePrecreatedQueues: true });
};


