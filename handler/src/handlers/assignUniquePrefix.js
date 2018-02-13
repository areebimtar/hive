import * as messageUtils from '../messageUtils';
import { assert } from 'global/assert';
import { EXCHANGES } from '../constants';

export default class AssignUniquePrefix {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async process(logger, message) {
    const userId = messageUtils.getHeaderField(message, 'userId');

    const user = await this.models.auth.users.getById(userId);
    assert(user, `No user with ID: ${userId}`);

    const prefix = `${user.db}-${user.type}`;

    const type = `${prefix}.${messageUtils.getHeaderField(message, 'type')}`;

    let msg = messageUtils.setHeaderField(message, 'messageId', messageUtils.getNewMessageId());
    msg = messageUtils.setHeaderField(msg, 'type', type);

    return this.rabbit.publish(logger, EXCHANGES.UNIQUE_PREFIX_ROUTER, type, msg);
  }
}
