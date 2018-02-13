import _ from 'lodash';
import config from './config';
import { Logger as LoggerBase } from 'global/logger';

const METHODS = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

export class Logger {
  constructor(namespace) {
    this.logger = new LoggerBase(config.logging);

    const prefix = namespace ? `<${namespace}> ` : '';
    _.each(METHODS, method => _.set(this, method, (...params) => {
      const logFn = this.logger[method];
      if (params.length === 1 && _.isObject(params[0])) {
        return logFn(params[0]);
      }
      const remainingParams = params.length === 2 ? params[1] : params.slice(1);
      return logFn(prefix + params[0], remainingParams);
    }));
  }

  process(message) {
    this.debug('Processing message', message);
  }

  processed() {
    this.debug('Message has been successfully processed');
  }

  publishMessage(destination, routingKey, message) {
    this.debug(`Publishing message in "${destination}" with routing key "${routingKey}"`, message);
  }

  unknownMessageType(type) {
    this.error(`Received unknown mesage type: ${type}`);
  }
}

export default new Logger();
