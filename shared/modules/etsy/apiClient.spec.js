import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ApiClient from './apiClient';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const fakeConfig = { etsy: {
  apiUrl: 'fakeapi://host/etsy',
  auth: {
    consumerKey: 'consumerKey',
    consumerSecret: 'consumerSecret'
  }
}};

const noop = () => {};

const fakeLogger = {
  error: noop,
  warn: noop,
  info: noop
};

describe('test apiClient', () => {
  describe('apiClient#getShopSections', () => {
    let apiClient;
    let mockedClient;

    // Mocks '_get' method to return $ret for shop with id = $id
    const mockGet = (id, ret) => {
      mockedClient.expects('_get').withArgs(`/shops/${id}/sections`).once().returns(ret);
    };

    beforeEach(() => {
      apiClient = new ApiClient(fakeConfig, fakeLogger, 'token', 'tokenSecret');
      mockedClient = sinon.mock(apiClient);
    });

    afterEach(() => {
      mockedClient.verify();
    });

    it('GetShopSection rejects if response type is not ShopSection', async () => {
      mockGet(1, {});

      await expect(apiClient.getShopSections(1)).to.eventually.be.rejectedWith(Error, 'Unexpected response type: undefined');
    });

    it('GetShopSection process empty response', async () => {
      mockGet(1, { type: 'ShopSection', results: []});

      await expect(apiClient.getShopSections(1)).to.eventually.be.deep.equal([]);
    });

    it('GetShopSection skips section without title', async () => {
      // the first object has no title => it should be skipped in result
      mockGet(1, { type: 'ShopSection', results: [{shop_section_id: 1}, {shop_section_id: 2, title: 'title'}]});

      const expectedResult = [{ section_id: 2, name: 'title'}];

      await expect(apiClient.getShopSections(1)).to.eventually.be.deep.equal(expectedResult);
    });
  });
});
