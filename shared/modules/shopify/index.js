import _ from 'lodash';
import { CHANNEL } from '../../constants';
import Auth from './auth';
import ApiClient from './apiClient';
import logger from 'logger';
import { MAX_PRODUCTS_IN_QUERY } from './constants';

export default class Shopify {
  constructor(config) {
    this.auth = new Auth(config);
    this._config = config;
  }

  async getShop(accountProperties) {
    const api = new ApiClient(this._config, logger, this.auth, accountProperties.token);

    return api.getShop(accountProperties.domain);
  }

  async getShops(accountProperties) {
    const shop = await this.getShop(_.pick(accountProperties, ['token', 'domain']));
    return [shop];
  }

  async getListings(accountProperties, shopUrl, fields) {
    const api = new ApiClient(this._config, logger, this.auth, accountProperties.oauth_token);

    return api.getListings(shopUrl, fields);
  }

  getShopInfoMessage(shopUrl) {
    return {
      method: 'GET',
      url: `https://${shopUrl}/admin/shop.json`,
      params: null
    };
  }

  getProductsCountMessage(shopUrl) {
    return {
      method: 'GET',
      url: `https://${shopUrl}/admin/products/count.json`,
      params: null
    };
  }

  getGetProductsMessages(shopUrl, count, fields) {
    const messages = [];
    let page = 0;
    do {
      const message = {
        method: 'GET',
        url: `https://${shopUrl}/admin/products.json`,
        params: {
          page: page + 1,
          limit: MAX_PRODUCTS_IN_QUERY
        },
        count: Math.min(count - page * MAX_PRODUCTS_IN_QUERY, MAX_PRODUCTS_IN_QUERY)
      };

      if (!_.isEmpty(fields)) {
        message.params.fields = fields.join(',');
      }

      messages.push(message);

      page++;
    } while ((page * MAX_PRODUCTS_IN_QUERY) < count);

    return messages;
  }

  getDownloadProductMessage(shopUrl, productId) {
    return {
      method: 'GET',
      url: `https://${shopUrl}/admin/products/${productId}.json`,
      params: null
    };
  }

  getUploadProductMessage(shopUrl, product) {
    return {
      method: 'PUT',
      url: `https://${shopUrl}/admin/products/${product.id}.json`,
      params: null,
      payload: {
        product: product
      }
    };
  }

  NAME = 'Shopify';
  ID = CHANNEL.SHOPIFY;
}
