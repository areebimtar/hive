import * as messageUtils from '../messageUtils';

import { EXCHANGES } from '../constants';

export default class ShopifyToAPICall {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async process(logger, message) {
    const headers = messageUtils.getHeaders(message);

    const [shop, account] = await this.models.compositeRequests.getShopAccountByShopId(headers.shopId); // eslint-disable-line no-unused-vars

    // set token
    const msg = messageUtils.setBodyField(message, ['request', 'token'], account.oauth_token);

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_API_CALLS, headers.type, msg);
  }
}
