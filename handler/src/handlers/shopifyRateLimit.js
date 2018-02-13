import _ from 'lodash';
import Bucket from 'dripping-bucket';

import { EXCHANGES, QUEUES } from '../constants';
import * as messageUtils from '../messageUtils';

export default class ShopifyRateLimit {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;

    this.bucket = new Bucket({
      buckets: {
        size: _.get(config, ['shopify', 'rateLimit', 'size']),
        refreshRate: _.get(config, ['shopify', 'rateLimit', 'refreshRate'])
      }
    });
  }

  async delayAPICall(logger, message, delay) {
    logger.debug(`No token left, delaying message by ${delay}ms`);

    const type = messageUtils.getHeaderField(message, 'type');
    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_API_CALLS_WAIT, type, message, { expiration: delay });
  }

  async passAPICall(logger, message) {
    logger.debug('Ready to make API call, passing message through');

    const type = messageUtils.getHeaderField(message, 'type');
    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_SLOW_STREAM_API_CALLS, type, message);
  }

  async processAPICall(logger, message) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    const delay = await this.bucket.getDelay(shopId);

    if (delay) {
      return this.delayAPICall(logger, message, delay);
    }

    return this.passAPICall(logger, message);
  }

  async processAPICallResponse(logger, message) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    await this.bucket.returnToken(shopId);
  }

  async process(logger, message, queueName) {
    switch (queueName) {
      case QUEUES.SHOPIFY_API_CALLS:
        await this.processAPICall(logger, message);
        break;
      case QUEUES.SHOPIFY_API_RESPONSES_TIMES:
        await this.processAPICallResponse(logger, message);
        break;
      default:
        break;
    }
  }
}
