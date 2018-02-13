import request from 'superagent';
import superagentOauth from 'superagent-oauth';
import Promise from 'bluebird';
import ShopifyAuth from 'global/modules/shopify/auth';

import * as messageUtils from '../messageUtils';
import { EXCHANGES } from '../constants';

superagentOauth(request);


export default class ShopifyAPICall {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  makeAPICall(requestData) {
    const { method, url, params, payload } = requestData;
    const methodFnName = String(method).toLowerCase();

    const shopifyAuth = new ShopifyAuth(this.config);
    const oauth = shopifyAuth.createOAuth();

    const apiCall = request[methodFnName](url);

    if (params) {
      apiCall.query(params);
    }

    if (payload) {
      apiCall.send(payload);
    }

    apiCall.sign(oauth, requestData.token);

    return new Promise((resolve, reject) => {
      apiCall.end((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  async process(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const body = messageUtils.getBody(message);
    const requestData = body.request;

    let response;
    try {
      const result = await this.makeAPICall(requestData);
      response = {
        status: result.status,
        data: result.body
      };
    } catch (error) {
      response = {
        status: 'error',
        data: error
      };
    }

    logger.debug('api call response', response);

    const msg = messageUtils.setBodyField(message, ['response'], response);

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_API_CALLS_RESPONSE, headers.type, msg);
  }
}
