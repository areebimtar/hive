import _ from 'lodash';
import Promise from 'bluebird';
import logger, { Logger } from 'logger';
import Amqp from './amqp';
import { ROLES_TO_QUEUE_MAP, EXCHANGES, STATUS } from '../constants';
import { assert } from 'global/assert';
import * as messageUtils from '../messageUtils';

export default class RabbitClient {
  constructor(uri, prefix, retries) {
    this._uri = uri;
    this._prefix = prefix;
    this._retries = retries;

    this._amqp = new Amqp(uri);
  }

  async ackMessage(message) {
    try {
      await message.ack();
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: 'Unable to ack message',
        content: message.content
      });
    }
  }

  async nackMessage(message) {
    try {
      await message.nack();
    } catch (e) {
      logger.error({
        topic: 'rabbit',
        details: 'Unable to nack message',
        content: message.content
      });
    }
  }

  retryMessage(role, queueName, error, message) {
    const retries = messageUtils.getHeaderField(message, 'retries', 0) + 1;
    const msg = messageUtils.setHeaderField(message, 'retries', retries);

    logger.debug(`Enqueuing failed message again in ${queueName}. # of retries: ${retries}`, msg);
    return this.sendToQueue(queueName, msg);
  }

  notifyHandler(error, message) {
    const type = messageUtils.getErrorType(message);
    let msg = messageUtils.setHeaderField(message, 'type', type);
    msg = messageUtils.setBodyField(msg, 'error', error.message);
    msg = messageUtils.setBodyField(msg, 'originalMessage', message);

    logger.debug(`Publishing message in ${EXCHANGES.CHANNEL_ROUTER}`, msg);
    return this._amqp.publish(this.getResolvedName(EXCHANGES.CHANNEL_ROUTER), type, msg);
  }

  async handleError(role, queueName, error, message) {
    const retries = messageUtils.getHeaderField(message, 'retries', 0);
    // should we schedule message again?
    if (retries < this._retries) {
      return this.retryMessage(role, queueName, error, message);
    }

    return this.notifyHandler(error, message);
  }

  async handler(role, queueName, callback, message) {
    const content = message.content;
    try {
      const messageId = messageUtils.getHeaderField(content, 'messageId');
      const queue = this.getResolvedName(queueName);
      const loggerPrefix = messageId ? `${role}(${queue}):${messageId}` : `${role}(${queue})`;
      const handlerLogger = new Logger(loggerPrefix);

      handlerLogger.process(content);
      const result = await callback(handlerLogger, content, queueName);
      handlerLogger.processed();
      (result === STATUS.NACK) ? this.nackMessage(message) : this.ackMessage(message);
    } catch (error) {
      logger.error({
        topic: 'rabbit',
        details: 'Error during processing message',
        error: error,
        content: content
      });
      await this.handleError(role, queueName, error, content);
      this.nackMessage(message);
    }
  }

  getPrefixedName(name) {
    return name && this._prefix ? `${this._prefix}.${name}` : name;
  }

  getResolvedName(name) {
    return String(name).replace('${prefix}', this._prefix);
  }

  async connectAndSubcribe(roles) {
    try {
      await Promise.all(_.map(roles, (callBacks, role) =>
        Promise.all(_.map(callBacks, callBack => this.subscribe(role, callBack)))
      ));
    } catch (error) {
      logger.error(error);
      process.exit(1);
    }

    logger.info('All roles successfully subscribed to queues');
  }

  async subscribe(role, callBack) {
    const queues = ROLES_TO_QUEUE_MAP[role];

    return Promise.each(queues, async queueName => {
      assert(queueName, `Unknown queue "${queueName}" for role "${role}"`);
      const queue = this.getResolvedName(queueName);

      try {
        await this._amqp.subscribe(queue, this.handler.bind(this, role, queueName, callBack));
        logger.info({
          topic: 'rabbit',
          event: 'subscribe',
          details: `Subcribed to ${role} role (${queue})`
        });
      } catch (e) {
        logger.error({
          topic: 'rabbit',
          details: `Failed to subcribe to ${role} role (${queue})`,
          error: e
        });
        throw e;
      }
    });
  }

  async publish(handlerLogger, exchange, routingKey, message, options) {
    handlerLogger.publishMessage(this.getResolvedName(exchange), routingKey, message);
    this._amqp.publish(this.getResolvedName(exchange), routingKey, message, options);
  }

  async sendToQueue(queue, message, options) {
    this._amqp.sendToQueue(this.getResolvedName(queue), message, options);
  }
}
