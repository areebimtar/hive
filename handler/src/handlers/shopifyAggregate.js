import _ from 'lodash';
import { EXCHANGES } from '../constants';
import * as messageUtils from '../messageUtils';
import { MESSAGE_TYPE } from '../constants';
import { camelizeKeys } from 'global/db/utils';
import { assert } from 'global/assert';

export default class ShopifyAggregate {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async insertAggregates(logger, message, transaction) {
    try {
      const { shopId, messageId } = messageUtils.getHeaders(message);
      const { status, message: statusMessageRaw } = messageUtils.getBody(message);
      const stack = messageUtils.getStack(message);
      const parentMessageId = _.get(stack, [0, 'messageId'], null);
      const statusMessage = _.isObject(statusMessageRaw) ? JSON.stringify(statusMessageRaw) : statusMessageRaw;

      assert(shopId, `Missing shopId`);
      assert(messageId, `Missing messageId`);
      assert(parentMessageId, `Missing parent task in stack`);

      logger.debug(`Adding new aggregate with shopId = ${shopId}, parentMessageId = ${parentMessageId}, messageId = ${messageId}, status = ${status}, message = ${statusMessage}`);

      await this.models.aggregates.add(shopId, parentMessageId, messageId, status, statusMessage, transaction);
    } catch (error) {
      // if we can get here, it doesn't mean that we failed terribly.
      // it could simply mean that we tried to insert new aggregate row which was already there.
      // we probably failed terribly somewhere else
      logger.debug('Failed to insert new aggregate row', error);
    }
  }

  getAggregates(message, transaction) {
    const parentMessageId = messageUtils.getParentStackField(message, 'messageId');

    return this.models.aggregates.getByParentMessageId(parentMessageId, transaction);
  }

  areAllAggregatesDone(message, aggregates) {
    const { total } = messageUtils.getHeaders(message);
    // if we have more aggregates than total, something weird is going on
    assert(aggregates.length <= total, `We have more aggregates (${aggregates.length}) than there was total # of messages (${total}`);
    return total === aggregates.length;
  }

  async notifyParentTask(logger, message, aggregates) {
    const stack = messageUtils.getStack(message);
    if (_.isEmpty(stack)) { return; }

    const headers = stack.shift();
    headers.type += `.${MESSAGE_TYPE.SUBTASKS_COMPLETED}`;

    const msg = {
      headers: headers,
      stack: stack,
      body: {
        results: _.map(aggregates, camelizeKeys)
      }
    };

    await this.rabbit.publish(logger, EXCHANGES.CHANNEL_ROUTER, headers.type, msg);
  }

  async markAggregatesForRemoval(logger, message, transaction) {
    const parentMessageId = messageUtils.getParentStackField(message, 'messageId');

    logger.debug(`Mark aggregates for messageId = ${parentMessageId} ready for delete`);
    await this.models.aggregates.markAsDeletedByParentId(parentMessageId, transaction);
  }

  async removeAggregates(logger, message) {
    const parentMessageId = messageUtils.getParentStackField(message, 'messageId');

    logger.debug(`Removing aggregates for messageId = ${parentMessageId}`);
    await this.models.aggregates.deleteByParentMessageId(parentMessageId);
  }

  async process(logger, message) {
    await this.insertAggregates(logger, message);

    const removeAggregates = await this.models.db.tx(async transaction => {
      const aggregates = await this.getAggregates(message, transaction);
      const allDone = this.areAllAggregatesDone(message, aggregates);
      if (allDone) {
        await this.notifyParentTask(logger, message, aggregates);
        await this.markAggregatesForRemoval(logger, message, transaction);
      }
      return allDone;
    });

    if (removeAggregates) {
      await this.removeAggregates(logger, message);
    }
  }
}
