import _ from 'lodash';
import request from 'superagent';
import superagentOauth from 'superagent-oauth';
import Promise from 'bluebird';

superagentOauth(request);

const MAX_PRODUCTS_IN_QUERY = 250;

export default class ApiClient {
  constructor(config, logger, auth, token) {
    this._logger = logger;
    this._config = config;
    this._auth = auth;
    this._token = token;
  }

  processResponse = (resolve, reject) => (error, response) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(response.body);
  }

  normalizeQuery(query) {
    return _.reduce(query, (result, value, key) => _.set(result, key, _.isArray(value) ? value.join(',') : value), {});
  }

  _post(shopDomain, uri, payload, query) {
    const oauth = this._auth.createOAuth(shopDomain);

    return new Promise((resolve, reject) => {
      request.post(`${shopDomain}${uri}`)
        .send(payload)
        .query(query)
        .sign(oauth, this._token)
        .end(this.processResponse(resolve, reject));
    });
  }

  _get(shopDomain, uri, query) {
    const oauth = this._auth.createOAuth(shopDomain);

    return new Promise((resolve, reject) => {
      request.get(`https://${shopDomain}${uri}`)
        .query(query || {})
        .sign(oauth, this._token)
        .end(this.processResponse(resolve, reject));
    });
  }

  // //////////////////////////////////////////////////////////////
  // API Methods

  getShop = async (shopDomain) => {
    const { shop: shopData } = await this._get(shopDomain, '/admin/shop.json', null);

    return {
      channel_shop_id: shopData.id,
      name: shopData.name,
      domain: shopData.myshopify_domain
    };
  }

  getListings = async (shopDomain, fields) => {
    const query = fields ? { fields } : null;
    const { count } = await this._get(shopDomain, '/admin/products/count.json');

    let products = [];
    for (let i = 0; i < count; i += MAX_PRODUCTS_IN_QUERY) {
      const chunkQuery = this.normalizeQuery(query);
      chunkQuery.offset = i;
      chunkQuery.limit = Math.min((i + 1) * MAX_PRODUCTS_IN_QUERY, count);

      const { products: productsChunk } = await this._get(shopDomain, '/admin/products.json', chunkQuery);
      products = products.concat(productsChunk);
    }

    return products;
  }
}
