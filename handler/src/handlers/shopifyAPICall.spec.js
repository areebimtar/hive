import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import logger from 'logger';

import ShopifyAPICall from './shopifyAPICall';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

describe('shopifyAPICall', () => {
  let config;
  let rabbit;
  let request;
  let createOAuth;

  beforeEach(() => {
    config = {
      test: 'config'
    };

    createOAuth = sinon.stub().returns('shopifyOAUTH2');
    const ShopifyAuth = () => ({ createOAuth });
    ShopifyAPICall.__Rewire__('ShopifyAuth', ShopifyAuth);

    request = {
      get: sinon.stub(),
      post: sinon.stub(),
      put: sinon.stub(),
      delete: sinon.stub(),
      query: sinon.stub(),
      send: sinon.stub(),
      sign: sinon.stub()
    };
    request.get.returns(request);
    request.post.returns(request);
    request.put.returns(request);
    request.delete.returns(request);
    request.query.returns(request);
    request.send.returns(request);
    request.sign.returns(request);

    ShopifyAPICall.__Rewire__('request', request);

    rabbit = {
      publish: sinon.stub()
    };
  });

  afterEach(() => {
    ShopifyAPICall.__ResetDependency__('ShopifyAuth');
    ShopifyAPICall.__ResetDependency__('request');
  });

  describe('makeAPICall', () => {
    it('should use corect method', async () => {
      request.end = cb => cb(null, 'result');
      const shopifyAPICall = new ShopifyAPICall(config, null, rabbit);

      expect(await shopifyAPICall.makeAPICall({ method: 'GET' })).to.eql('result');
      expect(await shopifyAPICall.makeAPICall({ method: 'GeT' })).to.eql('result');
      expect(await shopifyAPICall.makeAPICall({ method: 'poST' })).to.eql('result');
      expect(await shopifyAPICall.makeAPICall({ method: 'put' })).to.eql('result');
      expect(await shopifyAPICall.makeAPICall({ method: 'deLete' })).to.eql('result');
    });

    it('should add query parameters', async () => {
      request.end = cb => cb(null, 'result');
      const shopifyAPICall = new ShopifyAPICall(config, null, rabbit);
      await shopifyAPICall.makeAPICall({ method: 'GET', params: { test: 'param' } });

      expect(request.query).to.have.been.calledOnce;
      expect(request.query).to.have.been.calledWithExactly({ test: 'param' });
    });

    it('should attach payload', async () => {
      request.end = cb => cb(null, 'result');
      const shopifyAPICall = new ShopifyAPICall(config, null, rabbit);
      await shopifyAPICall.makeAPICall({ method: 'POST', payload: { test: 'payload' } });

      expect(request.send).to.have.been.calledOnce;
      expect(request.send).to.have.been.calledWithExactly({ test: 'payload' });
    });

    it('should sign request', async () => {
      request.end = cb => cb(null, 'result');
      const shopifyAPICall = new ShopifyAPICall(config, null, rabbit);
      await shopifyAPICall.makeAPICall({ method: 'GET', token: '1234567890' });

      expect(createOAuth).to.have.been.calledOnce;

      expect(request.sign).to.have.been.calledOnce;
      expect(request.sign).to.have.been.calledWithExactly('shopifyOAUTH2', '1234567890');
    });

    it('should succeed', async () => {
      request.end = cb => cb(null, 'result');
      const shopifyAPICall = new ShopifyAPICall(config, null, rabbit);
      await shopifyAPICall.makeAPICall({ method: 'GET', token: '1234567890' });
    });

    it('should fail', async () => {
      request.end = cb => cb('error', null);
      const shopifyAPICall = new ShopifyAPICall(config, null, rabbit);
      try {
        await shopifyAPICall.makeAPICall({ method: 'GET', token: '1234567890' });
        expect(false).to.be.true;
      } catch (error) {
        expect(true).to.be.true;
      }
    });
  });

  describe('process', () => {
    let shopifyAPICall;

    beforeEach(() => {
      shopifyAPICall = new ShopifyAPICall(config, null, rabbit);
      sandbox.stub(shopifyAPICall, 'makeAPICall');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should make API call', async () => {
      shopifyAPICall.makeAPICall.returns({ status: 200, body: 'result' });
      await shopifyAPICall.process(logger, { body: { request: { method: 'GET', token: '1234567890' } } });

      expect(shopifyAPICall.makeAPICall).to.have.been.calledOnce;
      expect(shopifyAPICall.makeAPICall).to.have.been.calledWithExactly({ method: 'GET', token: '1234567890' });
    });

    it('should enqueue message', async () => {
      shopifyAPICall.makeAPICall.returns({ status: 200, body: 'result' });
      await shopifyAPICall.process(logger, { body: { request: { method: 'GET', token: '1234567890' } } });

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish.args[0][1]).to.eql('${prefix}.shopify-api-calls-response');
    });

    it('should succeed', async () => {
      shopifyAPICall.makeAPICall.returns({ status: 200, body: 'result' });
      await shopifyAPICall.process(logger, { headers: { type: 'prefix.shopify.testOp' }, body: { request: { method: 'GET', token: '1234567890' } } });

      expect(shopifyAPICall.makeAPICall).to.have.been.calledOnce;
      expect(shopifyAPICall.makeAPICall).to.have.been.calledWithExactly({ method: 'GET', token: '1234567890' });

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-api-calls-response', 'prefix.shopify.testOp', { headers: { type: 'prefix.shopify.testOp' }, body: { request: { method: 'GET', token: '1234567890' }, response: { data: 'result', status: 200 } } });
    });

    it('should fail', async () => {
      shopifyAPICall.makeAPICall.throws();
      await shopifyAPICall.process(logger, { body: { request: { method: 'GET', token: '1234567890' } } });

      expect(shopifyAPICall.makeAPICall).to.have.been.calledOnce;
      expect(shopifyAPICall.makeAPICall).to.have.been.calledWithExactly({ method: 'GET', token: '1234567890' });

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish.args[0][3].body.response.status).to.eql('error');
    });
  });
});
