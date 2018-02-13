import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import logger from 'logger';

import RateLimit from './shopifyRateLimit';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

const SHOP_ID = 123;

describe('ShopifyRateLimit', () => {
  let rateLimit;
  let rabbit;
  let message;
  let getDelay;
  let returnToken;

  beforeEach(() => {
    rabbit = { publish: sinon.stub() };

    message = { headers: { type: 'test type', shopId: SHOP_ID }, test: 'message' };

    getDelay = sinon.stub();
    returnToken = sinon.stub();
    const Bucket = function BucketClass() {
      this.getDelay = getDelay;
      this.returnToken = returnToken;
    };
    RateLimit.__Rewire__('Bucket', Bucket);

    rateLimit = new RateLimit(null, null, rabbit);
  });

  afterEach(() => {
    RateLimit.__ResetDependency__('Bucket');
    sandbox.restore();
  });

  describe('delayAPICall', async () => {
    it('should publish message in delay queue', async () => {
      await rateLimit.delayAPICall(logger, message, 100);

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-api-calls-wait', 'test type', message, { expiration: 100 });
    });
  });

  describe('passAPICall', async () => {
    it('should publish message in slow api calls queue', async () => {
      await rateLimit.passAPICall(logger, message, 100);

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-slow-stream-api-calls', 'test type', message);
    });
  });

  describe('processAPICall', () => {
    beforeEach(() => {
      sandbox.stub(rateLimit, 'delayAPICall');
      sandbox.stub(rateLimit, 'passAPICall');
    });

    it('should delay API call', async () => {
      getDelay.returns(100);
      await rateLimit.processAPICall(logger, message);

      expect(getDelay).to.have.been.calledOnce;
      expect(getDelay).to.have.been.calledWithExactly(SHOP_ID);

      expect(rateLimit.delayAPICall).to.have.been.calledOnce;
      expect(rateLimit.delayAPICall).to.have.been.calledWithExactly(logger, message, 100);
    });

    it('should pass API call', async () => {
      getDelay.returns(0);
      await rateLimit.processAPICall(logger, message);

      expect(getDelay).to.have.been.calledOnce;
      expect(getDelay).to.have.been.calledWithExactly(SHOP_ID);

      expect(rateLimit.passAPICall).to.have.been.calledOnce;
      expect(rateLimit.passAPICall).to.have.been.calledWithExactly(logger, message);
    });
  });

  describe('processAPICallResponse', () => {
    it('should return token', async () => {
      await rateLimit.processAPICallResponse(logger, message);

      expect(returnToken).to.have.been.calledOnce;
      expect(returnToken).to.have.been.calledWithExactly(SHOP_ID);
    });
  });

  describe('process', () => {
    beforeEach(() => {
      sandbox.stub(rateLimit, 'processAPICall');
      sandbox.stub(rateLimit, 'processAPICallResponse');
    });

    it('should process API call', async () => {
      await rateLimit.process(logger, message, '${prefix}.shopify-api-calls');

      expect(rateLimit.processAPICall).to.have.been.calledOnce;
      expect(rateLimit.processAPICall).to.have.been.calledWithExactly(logger, message);
    });

    it('should process API call responce', async () => {
      await rateLimit.process(logger, message, '${prefix}.shopify-api-responses-times');

      expect(rateLimit.processAPICallResponse).to.have.been.calledOnce;
      expect(rateLimit.processAPICallResponse).to.have.been.calledWithExactly(logger, message);
    });
  });
});
