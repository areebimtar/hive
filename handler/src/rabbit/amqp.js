import Promise from 'bluebird';
import _ from 'lodash';
import AmqpLib from 'amqplib';
import logger from 'logger';

import { assert } from 'global/assert';

import { AMQP } from 'global/constants';

function wait(interval) {
  return new Promise((resolve) =>
    setTimeout(resolve, interval));
}

function retry(fn) {
  const retryFn = async () => {
    try {
      return await fn();
    } catch (error) {
      await wait(AMQP.RECONNECT_DELAY);
      return await retryFn();
    }
  };

  return retryFn();
}

class Message {
  constructor(channel, rawMessage) {
    this.channel = channel;
    this.rawMessage = rawMessage;
  }

  get content() {
    const content = _.get(this.rawMessage, 'content');
    return content ? JSON.parse(content) : null;
  }

  ack() {
    assert(this.channel, 'Missing channel');
    this.channel.ack(this.rawMessage);
  }

  nack(allUpTo, requeue) {
    assert(this.channel, 'Missing channel');
    this.channel.nack(this.rawMessage, allUpTo, requeue);
  }
}

class Channel {
  constructor(queueName, getAmqpConnection) {
    this.queueName = queueName;
    this.getAmqpConnection = getAmqpConnection;

    this.resetChannel();
  }

  resetChannel() {
    this.channelInstance = null;
    this.initialised = false;
  }

  onReconnectHandler(message, onCloseHandler) {
    logger.error(`Got error on channel for queue ${this.queueName}`);
    if (this.initialised) {
      this.resetChannel();
      onCloseHandler();
    }
  }

  async createChannelInstance(onCloseHandler = _.noop) {
    if (this.channelInstance) { return; }

    const amqpConnection = await this.getAmqpConnection();
    assert(amqpConnection, 'You must estabilish AMQP connection first');

    this.channelInstance = await amqpConnection.createChannel();
    assert(this.channelInstance, 'Could not create channel');

    this.channelInstance.prefetch(AMQP.PREFETCH_COUNT);
    this.channelInstance.on('error', () => this.onReconnectHandler(`Got error on channel ${this.queueName}`, onCloseHandler));
    this.channelInstance.on('close', () => this.onReconnectHandler(`${this.queueName} was closed`, onCloseHandler));
  }

  async consume(queueName, handler, onCloseHandler) {
    try {
      this.resetChannel();
      await this.createChannelInstance(onCloseHandler);
      assert(this.channelInstance, 'You must create channel first');

      await this.channelInstance.consume(queueName, message =>
        handler(new Message(this, message)));

      this.initialised = true;
      logger.info(`Subcribed to queue ${this.queueName}`);
    } catch (error) {
      logger.info(`Got error on channel ${this.queueName}`, error);
      throw error;
    }
  }

  async publish(exchangeName, routingKey, message, options) {
    await this.createChannelInstance();
    return this.channelInstance.publish(exchangeName, routingKey, message, options);
  }

  async sendToQueue(queueName, message, options) {
    await this.createChannelInstance();
    return this.channelInstance.sendToQueue(queueName, message, options);
  }

  async ack(message) {
    this.channelInstance.ack(message);
  }

  async nack(message) {
    this.channelInstance.nack(message, false, false);
  }
}

export default class Amqp {
  constructor(uri) {
    this.uri = uri;
  }

  onCloseConnection = (error) => {
    const logFn = error ? logger.error : logger.debug;
    logFn('Amqp connection closed', error);
  }

  getConnection = async () => {
    if (this.connection) { return this.connection; }

    // connect to rabbit
    this.connection = await AmqpLib.connect(this.uri);
    this.connection.on('error', this.onCloseConnection);
    this.connection.on('close', this.onCloseConnection);

    return this.connection;
  }

  async getPublishChannel() {
    if (!this.publishChannel) {
      this.publishChannel = new Channel('Publishing channel', this.getConnection);
    }

    return this.publishChannel;
  }

  subscribe = async (queueName, handler) => {
    const onNewMessage = async (message) => {
      if (!message.content) {
        logger.error(`Received an empty message (queue doesn't exist). Restarting connection`);
        await onCloseHandler();
      } else {
        handler(message);
      }
    };

    const onCloseHandler = async () => {
      try {
        this.connection = null;
        await wait(AMQP.RECONNECT_DELAY);
        this.subscribe(queueName, onNewMessage);
      } catch (error) {
        await onCloseHandler();
      }
    };

    return retry(async () => {
      // get channel
      const channel = new Channel(queueName, this.getConnection);
      // start consuming messages
      await channel.consume(queueName, onNewMessage, onCloseHandler);
    });
  };

  publish = async (exchangeName, routingKey, content, options) => retry(async () => {
    const message = new Buffer(JSON.stringify(content));
    // get channel
    const publishChannel = await this.getPublishChannel();
    return publishChannel.publish(exchangeName, routingKey, message, options);
  });

  sendToQueue = async (queueName, content, options) => retry(async () => {
    const message = new Buffer(JSON.stringify(content));
    // get channel
    const publishChannel = await this.getPublishChannel();
    return publishChannel.sendToQueue(queueName, message, options);
  });
}
