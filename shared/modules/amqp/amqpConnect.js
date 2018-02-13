import Promise from 'bluebird';
import _ from 'lodash';

import AmqpLib from 'amqplib';
import { AMQP } from '../../constants';

// this function has been extracted from the Amqp class to allow
// us to rewire it during tests
function getPublicInterface(instance) {
  return {
    subscribeTokens: instance.subscribeTokens.bind(instance),
    subscribe: instance.subscribe.bind(instance),
    push: instance.push.bind(instance),
    publish: instance.publish.bind(instance),
    sendToQueue: instance.sendToQueue.bind(instance),
    deleteQueue: instance.deleteQueue.bind(instance),
    createQueue: instance.createQueue.bind(instance),
    bindQueue: instance.bindQueue.bind(instance),
    deleteExchange: instance.deleteExchange.bind(instance),
    createExchange: instance.createExchange.bind(instance),
    bindExchange: instance.bindExchange.bind(instance)
  };
}

class Amqp {
  constructor(uri, logger, onConnectFns) {
    this.logger = logger;
    this.uri = uri;
    this.onConnectFns = onConnectFns;
  }

  logEvent = (eventName, ...args) => {
    this.logger.error({topic: 'amqp', event: eventName, args: args});
  }

  reconnect = async () => {
    try {
      return this.connect({reconnect: true});
    } catch (e) {
      // exception has been logged already and a reconnect is scheduled, do nothing
      return Promise.resolve();
    }
  }

  handleConnectionError = (type, ...args) => {
    this.logEvent(type, args);
    delete this.connection;
    setTimeout(this.reconnect, AMQP.RECONNECT_DELAY);
  }

  async deleteQueue(name) {
    await this.channel.deleteQueue(name);
  }

  async createQueue(name, options) {
    await this.channel.assertQueue(name, options);
  }

  async deleteExchange(name) {
    await this.channel.deleteExchange(name);
  }

  async createExchange(name, type, options) {
    await this.channel.assertExchange(name, type, options);
  }

  async bindQueue(name, source, pattern) {
    await this.channel.bindQueue(name, source, pattern);
  }

  async bindExchange(name, source, pattern) {
    await this.channel.bindExchange(name, source, pattern);
  }

  async connect(options = {}) {
    try {
      this.connection = await AmqpLib.connect(this.uri);
      this.channel = await this.connection.createChannel();
      this.channel.prefetch(AMQP.PREFETCH_COUNT);
      // register event callbacks
      this.channel.on('close', this.handleConnectionError.bind(this, 'close'));
      this.channel.on('error', this.handleConnectionError.bind(this, 'error'));
      this.channel.on('return', this.logEvent.bind(this, 'return'));
      this.channel.on('drain', _.noop);
    } catch (e) {
      if (options.reconnect) {
        return this.handleConnectionError('connection failure', e);
      } else {
        this.logEvent('startup connection failure', e);
        throw e;
      }
    }
    this.logger.info({topic: 'amqp', event: 'connected', uri: this.uri});

    const amqp = getPublicInterface(this);
    if (_.isArray(this.onConnectFns)) {
      await Promise.all(this.onConnectFns.map(fn => fn(amqp)));
    }
    return amqp;
  }

  // function to use to ack an amqp message
  ackMessageFn = (amqpMessage) => {
    if (amqpMessage) {
      return this.channel.ack(amqpMessage);
    } else {
      return undefined;
    }
  }

  // function to use to nack an amqp message
  nackMessageFn = (amqpMessage, allUpTo, requeue) => {
    if (amqpMessage) {
      return this.channel.nack(amqpMessage, allUpTo, requeue);
    } else {
      return undefined;
    }
  }

  // function to unsubscribe from queue
  unsubscribeFn = async (queueName) => {
    const tag = this.consumerTag;
    if (tag) {
      return this.channel.cancel(tag);
    } else {
      throw new Error(`no tag when unsubscribing from ${queueName}`);
    }
  }

  // subscribes to a queue with tokens
  // that exists because it has been created
  // by a migration script and does not contain
  // json data
  subscribeTokens = async (queueName, cb) => {
    const subscribeTokenConsumeHandler = (message) => {
      if (!message) {
        this.logEvent('consumeError', {error: 'Empty message'});
        return undefined;
      }

      const content = _.get(message, 'content');
      return cb({
        content: content,
        ack: this.ackMessageFn.bind(this, message),
        sendToDelay: this.nackMessageFn.bind(this, message, true, false),
        retry: this.nackMessageFn.bind(this, message),
        unsubscribe: this.unsubscribeFn.bind(this, queueName)
      });
    };
    try {
      const consumeResult = await this.channel.consume(queueName, subscribeTokenConsumeHandler);
      if (consumeResult) {
        this.consumerTag = consumeResult.consumerTag;
      }
      return consumeResult;
    } catch (e) {
      this.handleConnectionError('consumeError', {error: e});
      return Promise.resolve();
    }
  }

  // subscribes to a queue with json encoded data
  subscribe =  async (queueName, cb) => {
    const subscribeConsumeHandler = (message) => {
      if (!message) {
        this.logEvent('consumeError', {error: 'Empty message'});
        return undefined;
      }
      try {
        const parsedContent = JSON.parse(message.content);
        return cb({
          options: message.properties,
          content: parsedContent,
          ack: this.ackMessageFn.bind(this, message),
          deadletter: this.nackMessageFn.bind(this, message, true, false),
          retry: this.nackMessageFn.bind(this, message, false, true),
          nack: this.nackMessageFn.bind(this, message),
          unsubscribe: this.unsubscribeFn.bind(this, queueName)
        });
      } catch (error) {
        // get rid of the offending message to unblock handling of another messages
        this.nackMessageFn(message, true, false);
        this.logEvent('consumeError', {error: 'Failed to parse message.content'});
        return undefined;
      }
    };
    try {
      const consumeResult = await this.channel.consume(queueName, subscribeConsumeHandler);
      if (consumeResult) {
        this.consumerTag = consumeResult.consumerTag;
      }
      return consumeResult;
    } catch (e) {
      this.handleConnectionError('consumeError', {error: e});
      return Promise.resolve();
    }
  }

  // enqueues data directly to a queue
  push = async (queueName, content) => {
    try {
      const message = new Buffer(JSON.stringify(content));
      return this.channel.sendToQueue(queueName, message);
    } catch (e) {
      this.handleConnectionError('pushFailure', {error: e});
      return Promise.resolve();
    }
  }

  publish = async (exchangeName, routingKey, content, options) => {
    try {
      const message = new Buffer(JSON.stringify(content));
      return this.channel.publish(exchangeName, routingKey, message, options);
    } catch (e) {
      this.handleConnectionError('publishFailure', {error: e});
      return Promise.resolve();
    }
  }

  sendToQueue = async (queueName, content, options) => {
    try {
      const message = new Buffer(JSON.stringify(content));
      return this.channel.sendToQueue(queueName, message, options);
    } catch (e) {
      this.handleConnectionError('publishFailure', {error: e});
      return Promise.resolve();
    }
  }
}

export default async (uri, logger, onConnectFns, options = {}) => {
  const amqp = new Amqp(uri, logger, onConnectFns);
  return amqp.connect(options);
};
