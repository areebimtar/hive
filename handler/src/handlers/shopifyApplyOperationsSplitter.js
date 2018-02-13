import _ from 'lodash';
import Promise from 'bluebird';
import * as messageUtils from '../messageUtils';

import { EXCHANGES, MESSAGE_TYPE } from '../constants';

export default class ShopifyApplyOperationsSplitter {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async enqueueApplyOperations(logger, message, productId, total) {
    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.APPLY_OPERATIONS.COMMAND);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: messageUtils.getHeaderField(message, 'shopId'),
        total: total
      },
      stack: messageUtils.getChildStack(message),
      body: {
        productId: productId,
        operations: messageUtils.getBodyField(message, 'operations')
      }
    };

    return this.rabbit.publish(logger, EXCHANGES.CHANNEL_ROUTER, type, msg);
  }

  async scheduleApplyOperations(logger, message) {
    logger.info(`Scheduling apply operations`);

    const shopId = messageUtils.getHeaderField(message, 'shopId');
    const operations = messageUtils.getBodyField(message, 'operations');
    const productIds = _.uniq(_.reduce(operations, (ids, operation) => ids.concat(operation.products), []));

    if (!productIds.length) {
      this.finishApplyOperations(logger, message);
      return;
    }

    const total = productIds.length;
    await this.models.shops.applyStarted(shopId, total);
    await Promise.map(productIds, productId => this.enqueueApplyOperations(logger, message, productId, total));
  }

  async scheduleShopSync(logger, message) {
    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.COMMAND);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: messageUtils.getHeaderField(message, 'shopId')
      },
      stack: [],
      body: {
        triggeredByApplyOperations: true
      }
    };

    await this.rabbit.publish(logger, EXCHANGES.CHANNEL_ROUTER, type, msg);
  }

  async finishApplyOperations(logger, message) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');

    await this.scheduleShopSync(logger, message);

    await this.models.shops.applyFinished(shopId);
  }

  async process(logger, message) {
    const headers = messageUtils.getHeaders(message);

    const type = messageUtils.stripPrefix(headers.type);
    switch (type) {
      case MESSAGE_TYPE.SHOPIFY.APPLY_OPERATIONS_SPLITTER.SUBTASKS_COMPLETED:
        await this.finishApplyOperations(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.APPLY_OPERATIONS_SPLITTER.COMMAND:
        await this.scheduleApplyOperations(logger, message);
        break;
      default:
        logger.unknownMessageType(type);
    }
  }
}
