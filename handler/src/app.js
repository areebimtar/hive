import _ from 'lodash';
import RabbitClient from './rabbit/rabbitClient';
import { assert } from 'global/assert';
import Models from 'global/db/models';
import logger from './logger';
import { HANDLERS } from './handlers';

export default class App {
  constructor(db, config) {
    logger.debug('App::constructor');
    this.config = config;
    this.models = Models(db);
  }

  initializeRoles(roles) {
    return _.reduce(roles, (result, roleConfig, role) => {
      const Handler = HANDLERS[role];
      assert(Handler, `Couldn't find handler for role "${role}"`);
      const numOfInstances = _.get(roleConfig, 'numberOfInstaces', 1);
      const handlers = _.map(new Array(numOfInstances), () => new Handler(this.config, this.models, this.rabbit));

      return _.set(result, role, _.map(handlers, handler => (handlerLogger, message, queueName) => handler.process(handlerLogger, message, queueName)));
    }, {});
  }

  async initRabbit() {
    if (this.config.rabbitmq && !this.config.rabbitmq.mock) {
      this.rabbit = new RabbitClient(this.config.rabbitmq.uri, this.config.prefix, this.config.retries);

      const roles = this.initializeRoles(this.config.roles);

      this.rabbit.connectAndSubcribe(roles);
    } else {
      throw new Error(`RabbitMq not configured [${this.config.rabbitmq}]`);
    }
  }

  async init() {
    logger.info('Initializing Handler application with configuration: ' + JSON.stringify(this.config, undefined, 2));
    await this.initRabbit();
  }
}
