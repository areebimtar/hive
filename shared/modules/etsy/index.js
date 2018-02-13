import _ from 'lodash';
import moment from 'moment';
import {CHANNEL} from '../../constants';
import Auth from './auth';
import ApiClient from './apiClient';
import Promise from 'bluebird';

import {convertProductToListing, resultsInEmptyListing, convertProductVariationsToListingVariations, convertProductOfferingsToListingInventory} from './productToListing';
import {convertListingToProduct} from './listingToProduct';

const fakeRateLimiter = {
  getRequestStartDelay: () => {
    return Promise.resolve(0);
  },
  reportQuota: () => {}
};

const fakeLogger = {
  debug: () => {},
  error: () => {},
  warn: () => {}
};

export default class Etsy {
  constructor(config, rateLimiter, logger = fakeLogger) {
    this.auth = new Auth(config);
    this._config = config;
    this._rateLimiter = rateLimiter || fakeRateLimiter;
    this._logger = logger;
  }

  _getApiWrapper(requestName, accountProperties, requestsInfo) {
    const apiClient = new ApiClient(this._config, this._logger, accountProperties.oauth_token, accountProperties.oauth_token_secret);

    const updateRequestInfo = requestsInfo && _.isFinite(requestsInfo.requestsMade);

    let requestStartTime = undefined;
    const logRequestTime = () => {
      if (!requestStartTime) { return; }
      const requestEndTime = moment();
      const duration = requestEndTime.diff(requestStartTime);
      this._logger.debug(`Request duration: ${duration}ms (${requestStartTime.valueOf()} - ${requestEndTime.valueOf()})`);
    };

    const _handleRequestDone = (result) => {
      logRequestTime();
      if (updateRequestInfo) { requestsInfo.requestsMade++; }
      if (requestsInfo && _.isFunction(this._rateLimiter.reportQuota)) {
        this._rateLimiter.reportQuota(requestsInfo);
      }
      return result;
    };

    function _handleRequestFailed(exception) {
      logRequestTime();
      if (updateRequestInfo) { requestsInfo.requestsMade++; }
      throw (exception);
    }

    return _.reduce([].concat(requestName), (result, name) => {
      if (typeof(apiClient[name]) !== 'function') { throw new Error(`${name} is not a valid request name`); }
      result[name] = (...params) => {
        const args = [...params, requestsInfo];

        return this._rateLimiter.getRequestStartDelay()
          .then((delay) => {
            this._logger.debug(`Will delay for: ${delay}ms`);
            return delay;
          })
          .then((delay) => {
            return Promise.delay(delay);
          })
          .then(() => {
            requestStartTime = moment();
          })
          .then(() => { return apiClient[name].apply(apiClient, args); })
          .then(_handleRequestDone)
          .catch(_handleRequestFailed);
      };

      return result;
    }, {});
  }

  // Temporary method
  getShops(accountProperties) {
    const api = this._getApiWrapper(['getCurrentUserId', 'getShopsByUserId'], { oauth_token: accountProperties.token, oauth_token_secret: accountProperties.tokenSecret }, undefined);
    return api.getCurrentUserId()
      .then((userId) => {
        return api.getShopsByUserId(userId);
      });
  }

  getShop(accountProperties, shopId) {
    const api = this._getApiWrapper(['getShop'], accountProperties, undefined);
    return api.getShop(shopId);
  }

  async getListingsBySegment(api, shopId, state, segmentSize, offset) {
    const response = await api.getShopListingsByState(
      shopId,
      state,
      segmentSize,
      offset);

    const responseLength = response.results && response.results.length;

    this._logger.debug(`GetListing(shopId=${shopId}, state=${state}) with offset/count = (${offset}/${response.count}) returned length/count (${responseLength}/${response.count})`);

    return {
      listingsCount: response.count || 0,
      returnedCount: responseLength || 0,
      returnedListings: response.results
    };
  }

  async getListingsByState(api, shopId, state) {
    let offset = 0;
    let listingsCount;
    let listings = [];
    const getSegment = this.getListingsBySegment.bind(this, api, shopId, state, 100);
    do {
      const got = await getSegment(offset);
      listings = listings.concat(got.returnedListings);
      offset += got.returnedCount;
      // can change with every request!
      listingsCount = got.listingsCount;
      if (got.returnedCount <= 0) {
        break;
      }
    } while (offset < listingsCount);
    return listings;
  }

  async getListings(accountProperties, shopId, requests) {
    const api = this._getApiWrapper('getShopListingsByState', accountProperties, requests);
    const getForState = this.getListingsByState.bind(this, api, shopId);
    const activeListings = await getForState('active');
    const draftListings = await getForState('draft');
    const inactiveListings = await getForState('inactive');
    const listings = activeListings
      .concat(draftListings)
      .concat(inactiveListings);
    // API calls are not atomic we might have received some listings twice
    return _.uniq(listings, 'listing_id');
  }

  getShopSections(accountProperties, shopId, requests) {
    const api = this._getApiWrapper('getShopSections', accountProperties, requests);
    return api.getShopSections(shopId);
  }

  createNewSection(accountProperties, shopId, title, requests) {
    const api = this._getApiWrapper('createNewSection', accountProperties, requests);
    return api.createNewSection(shopId, title);
  }

  getListing(accountProperties, listingId, requests) {
    const api = this._getApiWrapper('getListingById', accountProperties, requests);
    return api.getListingById(listingId, requests)
      .then(listing => convertListingToProduct(this._logger, listing));
  }

  uploadProduct(accountProperties, unusedShopId, product, modifiedFields, requests) {
    if (resultsInEmptyListing(modifiedFields)) {
      this._logger.debug('Not sending empty listing for product', product.id);
      return Promise.resolve();
    } else {
      const listing = convertProductToListing(product, modifiedFields);
      const api = this._getApiWrapper('updateListing', accountProperties, requests);
      return api.updateListing(listing);
    }
  }

  uploadVariations(accountProperties, unusedShopId, listingId, product, variations, requests) {
    const listingVariations = convertProductVariationsToListingVariations(product, variations);
    const api = this._getApiWrapper('updateListingVariations', accountProperties, requests);
    return api.updateListingVariations(listingId, listingVariations);
  }

  uploadProductOfferings(accountProperties, unusedShopId, listingId, product, productOfferings, requests) {
    const listingInventory = convertProductOfferingsToListingInventory(listingId, productOfferings);
    const api = this._getApiWrapper('updateListingInventory', accountProperties, requests);
    return api.updateListingInventory(listingId, listingInventory);
  }

  uploadNewImage(accountProperties, unusedShopId, listingId, imageRank, imageData, imageMime, imageFileName, requests) {
    const api = this._getApiWrapper('uploadNewImage', accountProperties, requests);
    return api.uploadNewImage(listingId, imageRank, imageData, imageMime, imageFileName);
  }

  setImageRank(accountProperties, unusedShopId, listingId, imageId, newRank, requests) {
    const api = this._getApiWrapper('setImageRank', accountProperties, requests);
    return api.setImageRank(listingId, imageId, newRank);
  }

  getAllImages(accountProperties, unusedShopId, listingId, requests) {
    const api = this._getApiWrapper('getAllImages', accountProperties, requests);
    return api.getAllImages(listingId);
  }

  deleteImage(accountProperties, unusedShopId, listingId, imageId, requests) {
    const api = this._getApiWrapper('deleteImage', accountProperties, requests);
    return api.deleteImage(listingId, imageId);
  }

  updateAttribute(accountProperties, unusedShopId, listingId, attribute, requests) {
    const api = this._getApiWrapper('updateAttribute', accountProperties, requests);
    return api.updateAttribute(listingId, attribute);
  }

  deleteAttribute(accountProperties, unusedShopId, listingId, attribute, requests) {
    const api = this._getApiWrapper('deleteAttribute', accountProperties, requests);
    return api.deleteAttribute(listingId, attribute);
  }

  NAME = 'Etsy';
  ID = CHANNEL.ETSY;
}
