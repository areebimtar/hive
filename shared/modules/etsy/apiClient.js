import moment from 'moment';
import request from 'superagent';
import {OAuth} from 'oauth';
import superagentOauth from 'superagent-oauth';
import _ from 'lodash';
import Promise from 'bluebird';

import { FIELDS } from './constants';
import { AllHtmlEntities } from 'html-entities';

const entities = new AllHtmlEntities();

const HTTP_NOT_FOUND = 404;

function extractQuotaInfo(response, quotaInfo, logger) {
  logger && logger.debug('Remaining ratelimit:', response && response.headers && response.headers['x-ratelimit-remaining']);
  if (quotaInfo && response && response.headers && response.headers['x-ratelimit-remaining']) {
    quotaInfo.quotaRemaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
    quotaInfo.quotaDailyLimit = parseInt(response.headers['x-ratelimit-limit'], 10);
    quotaInfo.quotaTimestamp = moment().unix();
  }
}

const getErrorJson = (error, api) => {
  if (error && error.response && error.response.error) {
    const { status, text, method, path } = error.response.error;
    const message = error.message;
    return JSON.stringify({ message, status, text, method, path, ...api });
  } else {
    return JSON.stringify(api);
  }
};

// processCallResult(quotaInfo, resolve, reject) returns a handler that process results of superagent calls
// by resolving or rejecting (some outer) promise via passed resolve/reject callbacks.

const processCallResult = (api, resolve, reject, logger) => (error, response) => {
  // NOTE: uncoment following lines to log Etsy responses
  // const statusCode = _.get(response, 'status', error || 200);
  // const loggerFn = (statusCode >= 200 && statusCode <= 299) ? logger.debug : logger.error;
  // loggerFn('Processing Etsy call result error', error);
  // loggerFn('Processing Etsy call result response', _.pick(response, ['status', 'body']));

  const errorJson = getErrorJson(error, api);
  if (error) {
    return reject(new Error(errorJson));
  } else if (!response || !response.body) {
    return reject(new Error(`Empty response ${errorJson}`));
  } else {
    extractQuotaInfo(response, api.quotaInfo, logger);
    return resolve(response && response.body, response);
  }
};

function overrideSuperagentSetHeader(superagent) {
  function setHeader(field, val) {
    if (_.isObject(field)) {
      _.each(field, (value, key) => {
        this.set(key, value);
      });

      return this;
    }

    this.header[field] = val;
    return this;
  }
  superagent.Request.prototype.set = setHeader;
}

overrideSuperagentSetHeader(request);
superagentOauth(request);

export default class ApiClient {
  constructor(config, logger, token, tokenSecret) {
    this._logger = logger;
    this._token = token;
    this._tokenSecret = tokenSecret;
    this._apiUrl = config.etsy.apiUrl;
    this._oauth = new OAuth('', '', // don't need token URLs here
      config.etsy.auth.consumerKey,
      config.etsy.auth.consumerSecret,
      '1.0A', null, 'HMAC-SHA1'
    );
  }

  _post(uri, params, query, quotaInfo) {
    const url = `${this._apiUrl}${uri}`;

    return new Promise((resolve, reject) => {
      request.post(url)
        .send(params)
        .query(query)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end(processCallResult({url, params, quotaInfo}, resolve, reject, this._logger));
    });
  }

  _get(uri, queryParameters, quotaInfo) {
    const params = _.map(queryParameters, (value, key) => `${key}=${value}`).join('&');
    const url = `${this._apiUrl}${uri}?${params}`;

    return new Promise((resolve, reject) => {
      request.get(url)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end(processCallResult({url, params, quotaInfo}, resolve, reject, this._logger));
    });
  }

  _put(uri, params, quotaInfo) {
    const paramsWithoutArrays = {};
    const arrays = [];

    _.each(_.keys(params), (key) => {
      const parameter = params[key];

      // occasion and recipient are optional fields
      // etsy requires sending empty string to remove them
      if ((key === 'occasion' || key === 'recipient') && (parameter === null)) {
        paramsWithoutArrays[key] = '';
        return;
      }

      if ((key === FIELDS.SHOP_SECTION_ID) && (parameter === null)) {
        arrays.push(key + '=0');
        return;
      }

      if (!_.isArray(parameter)) {
        paramsWithoutArrays[key] = parameter;
        return;
      }

      // arrays needs to be encoded in URL due to OAuth implementation on Etsy side
      const value = _.map(parameter, encodeURIComponent).join(',');
      arrays.push(key + '=' + value);
    });

    const url = `${this._apiUrl}${uri}?${arrays.join('&')}`;

    return new Promise((resolve, reject) => {
      request.put(url)
        .send(paramsWithoutArrays)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end(processCallResult({url, params: paramsWithoutArrays, quotaInfo}, resolve, reject, this._logger));
    });
  }

  _postWithParams(uri, params, quotaInfo) {
    const url = `${this._apiUrl}${uri}`;
    return new Promise((resolve, reject) => {
      const req = request.post(url);

      _.each(params, (value, key) => {
        const fieldValue = (_.isObject(value) || _.isArray(value)) ? JSON.stringify(value) : value;
        req.field(key, fieldValue);
      });

      req
        .sign(this._oauth, this._token, this._tokenSecret)
        .end(processCallResult({url, params, quotaInfo}, resolve, reject, this._logger));
    });
  }

  // //////////////////////////////////////////////////////////////
  // API Methods

  // Returns current Etsy user ID
  getCurrentUserId(quotaInfo) {
    return this._get('/users/__SELF__', undefined, quotaInfo)
      .then((response) => {
        if (response.type !== 'User') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count !== 1) { throw new Error(`Incorrect count of users returned: ${response.count}`); }
        return response.results[0].user_id; // extract user info
      });
  }

  // Returns shop with shop ID
  // {id: shop_id, name: shop_name }
  getShop(shopId, quotaInfo) {
    return this._get(`/shops/${shopId}`, undefined, quotaInfo)
      .then((response) => {
        if (response.type !== 'Shop') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count !== 1) { throw new Error(`Unexpected response body: ${response.results}`); }

        const shop = response.results[0];
        return {
          id: shop.shop_id,
          name: shop.shop_name,
          inVacation: shop.is_vacation,
          inventory: shop.use_new_inventory_endpoints !== 0,
          user_id: shop.user_id
        };
      });
  }

  // Returns shops which are belongs to specified user
  // {id: shop_id, name: shop_name }
  getShopsByUserId(userId, quotaInfo) {
    return this._get(`/users/${userId}/shops`, undefined, quotaInfo)
      .then((response) => {
        if (response.type !== 'Shop') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count <= 0) { return []; }
        return _.map(response.results, (shop) => {
          return {
            channel_shop_id: shop.shop_id,
            name: shop.shop_name
          };
        });
      });
  }

  // Returns shop's listings
  // state - listing state (active, draft, expired, featured, inactive)
  // limit - number of listings returned at once (1-100)
  // offset - offset in listings
  getShopListingsByState(shopId, state, limit, offset, quotaInfo) {
    const uri = `/shops/${shopId}/listings/${state}`;
    const fields = ['listing_id', 'original_creation_tsz', 'last_modified_tsz', 'state', 'can_write_inventory'];
    const params = {
      fields: fields.join(',')
    };
    if (limit) { params.limit = limit; }
    if (offset) { params.offset = offset; }

    return this._get(uri, params, quotaInfo);
  }

  // Returns concrete listing
  getListingById(listingId, quotaInfo) {
    const uri = `/listings/${listingId}`;
    const includeParams = [
      'User', 'Shop', 'Section', 'Images', 'MainImage', 'Translations', 'Manufacturers', 'Inventory', 'Attributes' ];

    const params = {
      includes: includeParams.join(','),
      language: 'en'
    };

    return this._get(uri, params, quotaInfo)
      .then((response) => {
        if (response.type !== 'Listing') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count !== 1) { throw new Error(`Incorrect count of listings returned: ${response.count}`); }
        return response.results[0]; // return concrete listing
      });
  }

  updateListing(listing, quotaInfo) {
    this._logger.debug(`updateListing called with: listingId=${listing.listing_id}, data=${JSON.stringify(listing)}, quotaInfo=${quotaInfo}`);
    const uri = `/listings/${listing.listing_id}`;

    return this._put(uri, listing, quotaInfo)
      .then((response) => {
        if (response.type !== 'Listing') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count !== 1) { throw new Error(`Incorrect count of listings returned: ${response.count}`); }
        return response.results[0]; // return concrete listing
      });
  }

  async updateListingInventory(listingId, data, quotaInfo) {
    this._logger.debug(`updateListingInventory called with: listingId=${listingId}, data=${JSON.stringify(data)}, quotaInfo=${quotaInfo}`);

    const uri = `/listings/${listingId}/inventory`;
    return this._put(uri, data, quotaInfo);
  }

  uploadNewImage(listingId, imageRank, imageData, imageMime, imageFileName, quotaInfo) {
    const url = `${this._apiUrl}/listings/${listingId}/images`;

    return new Promise((resolve, reject) => {
      request.post(url)
        .field('listing_id', listingId)
        .field('rank', imageRank)
        .field('overwrite', 1)
        .attach('image', imageData, imageFileName)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end(processCallResult({url, params: { rank: imageRank, overwrite: 1 }, quotaInfo}, resolve, reject, this._logger));
    })
    .then((response) => {
      if (response.type !== 'ListingImage') { throw new Error(`Unexpected response type: ${response.type}`); }
      if (response.count !== 1) { throw new Error(`Incorrect count of images returned: ${response.count}`); }
      return { id: response.results[0].listing_image_id, thumbnailUrl: response.results[0].url_75x75, fullsizeUrl: response.results[0].url_fullxfull }; // extract image info
    });
  }

  setImageRank(listingId, imageId, newRank, quotaInfo) {
    const url = `${this._apiUrl}/listings/${listingId}/images`;

    return new Promise((resolve, reject) => {
      request.post(url)
        .field('listing_id', listingId)
        .field('listing_image_id', imageId)
        .field('rank', newRank)
        .field('overwrite', 1)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end(processCallResult({url, params: { listing_image_id: imageId, rank: newRank, overwrite: 1 }, quotaInfo}, resolve, reject, this._logger));
    })
    .then((response) => {
      if (response.type !== 'ListingImage') { throw new Error(`Unexpected response type: ${response.type}`); }
      if (response.count !== 1) { throw new Error(`Incorrect count of images returned: ${response.count}`); }
      return { id: response.results[0].listing_image_id, thumbnailUrl: response.results[0].url_75x75, fullsizeUrl: response.results[0].url_fullxfull }; // extract image info
    });
  }

  getAllImages(listingId) {
    return this._get(`/listings/${listingId}/images`)
      .then(response => response.results);
  }

  deleteImage(listingId, imageId, quotaInfo) {
    const url = `${this._apiUrl}/listings/${listingId}/images/${imageId}`;

    return new Promise((resolve, reject) => {
      request.delete(url)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end((error, response) => {
          if (error && error.response && error.response.error && error.response.error.status === HTTP_NOT_FOUND) {
            // if not found, ignore
            const fakeResponse = {body: {type: 'ListingImage', count: 0}};
            return processCallResult({url, params: {}, quotaInfo}, resolve, reject, this._logger)(null, fakeResponse);
          } else {
            return processCallResult({url, params: {}, quotaInfo}, resolve, reject, this._logger)(error, response);
          }
        });
    })
    .then((response) => {
      if (response.type !== 'ListingImage') { throw new Error(`Unexpected response type: ${response.type}`); }
      if (response.count !== 0) { throw new Error(`Incorrect count of images returned: ${response.count}`); }
      return undefined;
    });
  }

  updateAttribute(listingId, attribute, quotaInfo) {
    const uri = `/listings/${listingId}/attributes/${attribute.property_id}`;
    const params = _.pick(attribute, ['value_ids']);
    if (_.isFinite(_.get(attribute, 'scale_id', null))) {
      params.scale_id = attribute.scale_id;
    }

    return this._put(uri, params, quotaInfo)
      .then((response) => {
        if (response.type !== 'PropertyValue') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count !== 1) { throw new Error(`Incorrect count of attributes returned: ${response.count}`); }
        return undefined;
      });
  }

  deleteAttribute(listingId, attribute, quotaInfo) {
    const url = `${this._apiUrl}/listings/${listingId}/attributes/${attribute.property_id}`;

    return new Promise((resolve, reject) => {
      request.delete(url)
        .sign(this._oauth, this._token, this._tokenSecret)
        .end((error, response) => {
          return processCallResult({url, params: {}, quotaInfo}, resolve, reject, this._logger)(error, response);
        });
    })
    .then((response) => {
      if (response.type !== 'PropertyValue') { throw new Error(`Unexpected response type: ${response.type}`); }
      if (response.count !== 0) { throw new Error(`Incorrect count of attributes returned: ${response.count}`); }
      return undefined;
    });
  }

  async getShopSections(shopId, quotaInfo) {
    const uri = `/shops/${shopId}/sections`;

    const response = await this._get(uri, undefined, quotaInfo);

    if (response.type !== 'ShopSection') {
      throw new Error(`Unexpected response type: ${response.type}`);
    }

    return _(response.results)
      .map(section => {
        if (_.isString(section.title)) {
          section.decodedTitle = entities.decode(section.title);
        }
        return section;
      })
      .filter(section => {
        if (!_.trim(section.decodedTitle)) {
          this._logger.error(`getShopSections(${shopId}): Section '${JSON.stringify(section)}' is invalid (bad title) - filtering out from result`);
          return false;
        }
        return true;
      })
      .map(section => ({
        section_id: section[FIELDS.SHOP_SECTION_ID],
        name: section.decodedTitle
      }))
      .value();
  }

  createNewSection(shopId, title, quotaInfo) {
    const uri = `/shops/${shopId}/sections`;

    return this._post(uri, undefined, { title }, quotaInfo)
      .then((response) => {
        if (response.type !== 'ShopSection') { throw new Error(`Unexpected response type: ${response.type}`); }
        if (response.count !== 1) { throw new Error(`Unexpected number of sections returned: ${response.count}`); }

        return { section_id: response.results[0][FIELDS.SECTION_ID], name: response.results[0].title };
      });
  }
}
