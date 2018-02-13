import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ShopifyApplyOperationsSplitter from './shopifyApplyOperationsSplitter';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

const SHOP_ID = 123;
const PRODUCT_ID = 11;

describe('ShopifyApplyOperationsSplitter', () => {
  let models;
  let rabbit;
  let message;
  let messageUtils;
  let shopifyApplyOperationsSplitter;

  beforeEach(() => {
    rabbit = {
      getPrefixedName: value => value ? `prefix.${value}` : value,
      publish: sinon.stub()
    };

    models = {
      shops: {
        applyStarted: sinon.stub(),
        applyFinished: sinon.stub()
      }
    };

    message = {
      headers: {
        type: 'test.message',
        messageId: '0123456789',
        shopId: SHOP_ID
      },
      stack: [],
      body: {
        operations: [{products: [11, 22]}, {products: [33]}]
      }
    };

    messageUtils = ShopifyApplyOperationsSplitter.__get__('messageUtils');
    sandbox.stub(messageUtils, 'getNewMessageId');
    messageUtils.getNewMessageId.returns('test message id');

    shopifyApplyOperationsSplitter = new ShopifyApplyOperationsSplitter(null, models, rabbit);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('enqueueApplyOperations', () => {
    it('should enqueue message', async () => {
      await shopifyApplyOperationsSplitter.enqueueApplyOperations(logger, message, PRODUCT_ID, 3);

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.channel-router', 'prefix.shopify.applyOperations', {
        body: {
          productId: PRODUCT_ID,
          operations: [{products: [11, 22]}, {products: [33]}]
        },
        headers: {
          type: 'prefix.shopify.applyOperations',
          messageId: 'test message id',
          shopId: SHOP_ID,
          total: 3
        },
        stack: [{ type: 'test.message', messageId: '0123456789', shopId: 123 }]
      });
    });
  });

  describe('scheduleApplyOperations', () => {
    beforeEach(() => {
      sandbox.stub(shopifyApplyOperationsSplitter, 'enqueueApplyOperations');
      sandbox.stub(shopifyApplyOperationsSplitter, 'finishApplyOperations');
    });

    it('should do nothing', async () => {
      message.body.operations = [];
      await shopifyApplyOperationsSplitter.scheduleApplyOperations(logger, message);

      expect(models.shops.applyStarted).to.not.have.been.called;

      expect(shopifyApplyOperationsSplitter.finishApplyOperations).to.have.been.calledOnce;
      expect(shopifyApplyOperationsSplitter.finishApplyOperations).to.have.been.calledWithExactly(logger, message);
    });

    it('should mark shops applying operations flag', async () => {
      await shopifyApplyOperationsSplitter.scheduleApplyOperations(logger, message);

      expect(models.shops.applyStarted).to.have.been.calledOnce;
      expect(models.shops.applyStarted).to.have.been.calledWithExactly(SHOP_ID, 3);
    });

    it('should enqueue apply operations', async () => {
      await shopifyApplyOperationsSplitter.scheduleApplyOperations(logger, message);

      expect(shopifyApplyOperationsSplitter.enqueueApplyOperations).to.have.been.calledthrice;
      expect(shopifyApplyOperationsSplitter.enqueueApplyOperations).to.have.been.calledWithExactly(logger, message, 11, 3);
      expect(shopifyApplyOperationsSplitter.enqueueApplyOperations).to.have.been.calledWithExactly(logger, message, 22, 3);
      expect(shopifyApplyOperationsSplitter.enqueueApplyOperations).to.have.been.calledWithExactly(logger, message, 33, 3);
    });
  });

  describe('scheduleShopSync', () => {
    it('should enqueue message', async () => {
      await shopifyApplyOperationsSplitter.scheduleShopSync(logger, message);

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.channel-router', 'prefix.shopify.syncShop', {
        body: {
          triggeredByApplyOperations: true
        },
        headers: {
          type: 'prefix.shopify.syncShop',
          messageId: 'test message id',
          shopId: SHOP_ID
        },
        stack: []
      });
    });
  });

  describe('finishApplyOperations', () => {
    beforeEach(async () => {
      sandbox.stub(shopifyApplyOperationsSplitter, 'scheduleShopSync');

      await shopifyApplyOperationsSplitter.finishApplyOperations(logger, message);
    });

    it('should schedule sync shop', () => {
      expect(shopifyApplyOperationsSplitter.scheduleShopSync).to.have.been.calledOnce;
      expect(shopifyApplyOperationsSplitter.scheduleShopSync).to.have.been.calledWithExactly(logger, message);
    });

    it('should schedule sync shop', () => {
      expect(models.shops.applyFinished).to.have.been.calledOnce;
      expect(models.shops.applyFinished).to.have.been.calledWithExactly(SHOP_ID);
    });
  });
});
