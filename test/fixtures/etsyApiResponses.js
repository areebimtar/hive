import _ from 'lodash';
import nock from 'nock';

import SHOPRESULT from './shopresult.json';
import SHOPERROR from './shoperror.json';
import LISTING from './listing.json';
import INVENTORY from './inventory.json';
import SHOP_SECTIONS_RSP from './shopSectionsResponse.json';
import SHOP_RSP from './shopResponse.json';
import DRAFT_DUPL_LISTINGS from './draftDuplListings.json';
import INACTIVE_NO_LISTINGS from './inactiveNoListings.json';
import ACTIVE_NO_LISTINGS from './activeNoListings.json';

const ETSY_URL = 'http://notreallyetsy';

function makeEtsyErrorBody(errorJson) {
  return { response: {error: errorJson }};
}

export function getShopSuccessBody(overrides = {}) {
  return _.extend({}, SHOPRESULT, overrides);
}

export function getShopErrorBody(overrides = {}) {
  return _.extend({}, SHOPERROR, overrides);
}

export function getListingBody(overrides = {}) {
  return _.extend({}, LISTING, overrides);
}

export function getShopSections(overrides = {}) {
  return _.extend({}, SHOP_SECTIONS_RSP, overrides);
}

export function setupGetShopSuccess(shopId, overrides)  {
  const shopData = getShopSuccessBody();
  shopData.results[0].shop_id = shopId;
  shopData.results[0] = _.extend(shopData.results[0], overrides);
  nock(ETSY_URL).get(`/shops/${shopId}`).reply(200, shopData);
}

export function setupGetShopError(shopId, overrides)  {
  const errorJson = getShopErrorBody(overrides);
  nock(ETSY_URL).get(`/shops/${shopId}`).reply(errorJson.status, makeEtsyErrorBody(errorJson));
}

export function setupGetShopSections(shopId, overrides) {
  const sectionsJson = getShopSections(overrides);
  nock(ETSY_URL).get(`/shops/${shopId}/sections`)
    .reply(200, sectionsJson);
}

export function setupUploadListingSuccess(listingId) {
  nock(ETSY_URL).put(`/listings/${listingId}`).reply(200, LISTING);
}

export function setupUploadListingInventorySuccess(listingId) {
  nock(ETSY_URL).put(uri => _.startsWith(uri, `/listings/${listingId}/inventory`)).reply(200, INVENTORY);
}

export function getCorrectCountForDuplListings() {
  const listingIds = _(_.get(DRAFT_DUPL_LISTINGS, 'results'))
    .pluck('listing_id')
    .unique()
    .value();
  return listingIds.length;
}

export function setupShopWithDuplListings(etsyShopId) {
  // get shop
  nock(ETSY_URL).get(`/shops/${etsyShopId}`).reply(
    200,
    _(SHOP_RSP)
      .set('results.shop_id', etsyShopId)
      .set('params.shop_id', etsyShopId)
      .value()
  );
  // get shop sections
  nock(ETSY_URL).get(`/shops/${etsyShopId}/sections`).reply(200, _.set(SHOP_SECTIONS_RSP, 'params.shop_id', etsyShopId));
  // getting listings by state
  nock(ETSY_URL).get(uri => _.startsWith(uri, `/shops/${etsyShopId}/listings/active`)).reply(200, _.set(ACTIVE_NO_LISTINGS, 'params.shop_id', etsyShopId));
  nock(ETSY_URL).get(uri => _.startsWith(uri, `/shops/${etsyShopId}/listings/draft`)).reply(200, _.set(DRAFT_DUPL_LISTINGS, 'params.shop_id', etsyShopId));
  nock(ETSY_URL).get(uri => _.startsWith(uri, `/shops/${etsyShopId}/listings/inactive`)).reply(200, _.set(INACTIVE_NO_LISTINGS, 'params.shop_id', etsyShopId));
}

export function setupDownloadListing(listingId) {
  nock(ETSY_URL).get(`/listings/${listingId}?includes=User,Shop,Section,Images,MainImage,Translations,Manufacturers,Inventory,Attributes&language=en`).reply(200, LISTING);
}
