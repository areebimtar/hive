import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import * as etsyApiResponses from '../fixtures/etsyApiResponses';
const ApiClient = require('../../shared/modules/etsy/apiClient');
import { noopLogger } from './../util';
import nock from 'nock';
import superagent from 'superagent';


const apiClientConfig = {
  etsy: {
    apiUrl: 'http://notreallyetsy',
    auth: {
      consumerKey: 'consumerKey',
      consumerSecret: 'consumerSecret'
    }
  }
};

describe('nock works with superagent', () => {
  it('works with a generic api request', () => {
    nock('http://www.boonin.net')
      .get('/hello')
      .reply(200);

    return superagent.get('http://www.boonin.net/hello')
      .then(res => {
        expect(res.statusCode).to.eql(200);
      });
  });

  it('works with api client', () => {
    const api = new ApiClient(apiClientConfig, noopLogger, 'token', 'secret');
    nock('http://notreallyetsy')
      .get('/shops/2')
      .reply(200, etsyApiResponses.getShopSuccessBody());
    return expect(api.getShop(2)).to.be.fulfilled;
  });

  it('Works with put requests too', () => {
    const api = new ApiClient(apiClientConfig, noopLogger, 'token', 'secret');
    nock('http://notreallyetsy/')
      .put('/listings/12345')
      .reply(200, etsyApiResponses.getListingBody());
    return expect(api.updateListing({ listing_id: 12345 })).to.be.fulfilled;
  });
});
