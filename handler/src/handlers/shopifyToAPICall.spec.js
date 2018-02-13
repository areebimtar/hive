import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import logger from 'logger';

import ShopifyToAPICall from './shopifyToAPICall';

chai.use(sinonChai);

describe('ShopifyToAPICall', () => {
  let shopifyToAPICall;
  let rabbit;
  let models;

  beforeEach(async () => {
    models = {
      compositeRequests: {
        getShopAccountByShopId: sinon.stub().returns([null, { oauth_token: '1234567890' }])
      }
    };

    rabbit = {
      publish: sinon.stub()
    };

    shopifyToAPICall = new ShopifyToAPICall(null, models, rabbit);

    const message = {
      headers: {
        type: '12345.shopify.downloadProduct',
        shopId: 29
      },
      body: {
        request: {
          method: 'GET',
          URL: 'https://test-shop.myshopify.com'
        }
      }
    };

    await shopifyToAPICall.process(logger, message);
  });

  it('should push message to correct exchange', () => {
    expect(rabbit.publish).to.have.been.calledOnce;
    expect(rabbit.publish.args[0][1]).to.eql('${prefix}.shopify-api-calls');
    expect(rabbit.publish.args[0][2]).to.eql('12345.shopify.downloadProduct');
  });

  it('should add oauth token', async () => {
    const message = rabbit.publish.args[0][3];
    expect(message.body.request.token).to.eql('1234567890');
  });
});
