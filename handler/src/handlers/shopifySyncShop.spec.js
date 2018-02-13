import Promise from 'bluebird';
import moment from 'moment';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ShopifySyncShop from './shopifySyncShop';
import { SHOP_SYNC_STATUS_SYNC, SHOP_SYNC_STATUS_INITIAL_SYNC } from 'global/db/models/constants';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

const SHOP_ID = 12345;

describe('shopifySyncShop', () => {
  let shopifySyncShop;
  let models;
  let rabbit;
  let config;
  let messageUtils;

  beforeEach(() => {
    messageUtils = ShopifySyncShop.__get__('messageUtils');
    sandbox.stub(messageUtils, 'getNewMessageId');
    messageUtils.getNewMessageId.returns('test new message id');
    models = {
      shops: {
        syncStarted: sinon.stub(),
        updateSyncCounters: sinon.stub(),
        updateShopName: sinon.stub(),
        updateShopDomain: sinon.stub(),
        getById: sinon.stub()
      },
      syncShops: {
        addProducts: sinon.stub(),
        deleteByShopId: sinon.stub()
      },
      shopifyProducts: {
        getStatusSummariesByShopifyProductIds: sinon.stub(),
        upsertProducts: sinon.stub()
      },
      aggregates: {
        deleteByParentMessageId: sinon.stub()
      }
    };

    rabbit = {
      publish: sinon.stub(),
      getPrefixedName: value => `prefix.${value}`
    };

    config = {
      prefix: 'prefix'
    };

    shopifySyncShop = new ShopifySyncShop(config, models, rabbit);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('canStartSyncShop', () => {
    it('should be false if shop is invalid', async () => {
      expect(await shopifySyncShop.canStartSyncShop(logger, null, { invalid: true })).to.be.false;
    });

    it('should be false if sync is in progress', async () => {
      expect(await shopifySyncShop.canStartSyncShop(logger, null, { status: SHOP_SYNC_STATUS_SYNC })).to.be.false;
      expect(await shopifySyncShop.canStartSyncShop(logger, null, { status: SHOP_SYNC_STATUS_INITIAL_SYNC })).to.be.false;
    });

    it('should be false if shop is out of date', async () => {
      expect(await shopifySyncShop.canStartSyncShop(logger, null, { last_sync_timestamp: moment().toISOString() })).to.be.false;
    });

    it('should be true if shop is out of date but sync is triggered by used', async () => {
      expect(await shopifySyncShop.canStartSyncShop(logger, { body: { triggeredByUser: true } }, { last_sync_timestamp: moment().toISOString() })).to.be.true;
    });

    it('should be true', async () => {
      expect(await shopifySyncShop.canStartSyncShop(logger, null, { last_sync_timestamp: moment('1970-01-01').toISOString() })).to.be.true;
    });
  });

  describe('getProductsCount', () => {
    let Shopify;
    let getProductsCountMessage;

    beforeEach(() => {
      getProductsCountMessage = sinon.stub().returns('message body');
      sandbox.stub(shopifySyncShop, 'canStartSyncShop');
      Shopify = function ShopifyMock() {
        return {
          getProductsCountMessage
        };
      };
      ShopifySyncShop.__Rewire__('Shopify', Shopify);
    });

    afterEach(() => {
      ShopifySyncShop.__ResetDependency__('Shopify');
    });

    it('should enqueue message', async () => {
      await shopifySyncShop.getProductsCount(logger, { headers: { test: 'header' } }, { id: SHOP_ID, name: 'test name', domain: 'test-name.myshopify.com' });

      expect(getProductsCountMessage).to.have.been.calledOnce;
      expect(getProductsCountMessage).to.have.been.calledWithExactly('test-name.myshopify.com');

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.syncShop.count', { body: { request: 'message body' }, headers: { shopId: SHOP_ID, type: 'prefix.shopify.syncShop.count', messageId: 'test new message id' }, stack: [{ test: 'header' }] });
    });
  });

  describe('getShopInfo', () => {
    let Shopify;
    let getShopInfoMessage;

    beforeEach(() => {
      getShopInfoMessage = sinon.stub().returns('message body');
      Shopify = function ShopifyMock() {
        return {
          getShopInfoMessage
        };
      };
      ShopifySyncShop.__Rewire__('Shopify', Shopify);
    });

    afterEach(() => {
      ShopifySyncShop.__ResetDependency__('Shopify');
    });

    it('should enqueue message', async () => {
      await shopifySyncShop.getShopInfo(logger, { headers: { test: 'header' } }, { id: SHOP_ID, name: 'test name', domain: 'test-name.myshopify.com' });

      expect(getShopInfoMessage).to.have.been.calledOnce;
      expect(getShopInfoMessage).to.have.been.calledWithExactly('test-name.myshopify.com');

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.syncShop.shopInfo', { body: { request: 'message body' }, headers: { shopId: SHOP_ID, type: 'prefix.shopify.syncShop.shopInfo', messageId: 'test new message id' }, stack: [{ test: 'header' }] });
    });
  });

  describe('getProducts', () => {
    let Shopify;
    let messages;
    let getGetProductsMessages;
    let shop;

    beforeEach(() => {
      messages = [
        { apiCall: 1, count: 2 },
        { apiCall: 2, count: 2 },
        { apiCall: 3, count: 1 }
      ];

      shop = { id: SHOP_ID, name: 'test shop', domain: 'test-name.myshopify.com' };

      getGetProductsMessages = sinon.stub().returns(messages);
      sandbox.stub(shopifySyncShop, 'getShop');
      sandbox.stub(shopifySyncShop, 'canStartSyncShop');
      sandbox.stub(shopifySyncShop, 'markShopSyncDone');
      shopifySyncShop.getShop.returns(shop);
      Shopify = function ShopifyMock() {
        return {
          getGetProductsMessages
        };
      };
      ShopifySyncShop.__Rewire__('Shopify', Shopify);
    });

    it('should enqueue 3 messages', async () => {
      await shopifySyncShop.getProducts(logger, { headers: { test: 'header', type: 'test type', messageId: 'test message id' }, body: { response: { data: { count: 3 } } } }, { id: SHOP_ID, name: 'test shop' });

      expect(getGetProductsMessages).to.have.been.calledOnce;
      expect(getGetProductsMessages).to.have.been.calledWithExactly('test-name.myshopify.com', 3, ['id', 'updated_at']);

      expect(rabbit.publish).to.have.been.calledThrice;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.syncShop.getProducts', { body: { request: { apiCall: 1, count: 2 } }, headers: { shopId: SHOP_ID, type: 'prefix.shopify.syncShop.getProducts', messageId: 'test new message id', total: 2, batches: 3 }, stack: [{ shopId: SHOP_ID, type: 'prefix.shopify.syncShop.getProducts', messageId: 'test new message id', total: 2, batches: 3 }] });
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.syncShop.getProducts', { body: { request: { apiCall: 2, count: 2 } }, headers: { shopId: SHOP_ID, type: 'prefix.shopify.syncShop.getProducts', messageId: 'test new message id', total: 2, batches: 3 }, stack: [{ shopId: SHOP_ID, type: 'prefix.shopify.syncShop.getProducts', messageId: 'test new message id', total: 2, batches: 3 }] });
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.syncShop.getProducts', { body: { request: { apiCall: 3, count: 1 } }, headers: { shopId: SHOP_ID, type: 'prefix.shopify.syncShop.getProducts', messageId: 'test new message id', total: 1, batches: 3 }, stack: [{ shopId: SHOP_ID, type: 'prefix.shopify.syncShop.getProducts', messageId: 'test new message id', total: 1, batches: 3 }] });
    });

    it('should finish sync shop if there are no products in shop', async () => {
      await shopifySyncShop.getProducts(logger, { headers: { test: 'header' }, body: { response: { data: { count: 0 } } } }, { name: 'test name' });

      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledOnce;
      expect(getGetProductsMessages).to.not.have.been.called;
      expect(rabbit.publish).to.not.have.been.called;
    });
  });

  describe('getLeftDifference', () => {
    it('should return items from left which are not in right', () => {
      const left = [{ product_id: 1 }, { product_id: 2 }, { product_id: 3 }, { product_id: 4 }, { product_id: 5 }];
      const right = [{ product_id: 1 }, { product_id: 3 }, { product_id: 5 }];

      expect(shopifySyncShop.getLeftDifference(left, right)).to.eql([{ product_id: 2 }, { product_id: 4 }]);
    });
  });

  describe('getProductsToUpload', () => {
    it('should skip invalid products', () => {
      const products = [{ id: 1, _hive_is_invalid: true, _hive_modified_by_hive: true }, { id: 2, _hive_modified_by_hive: true }, { id: 3, _hive_is_invalid: true, _hive_modified_by_hive: true }, { id: 4, _hive_modified_by_hive: true }, { id: 5, _hive_is_invalid: true, _hive_modified_by_hive: true }];

      expect(shopifySyncShop.getProductsToUpload(products)).to.eql([{ id: 2, _hive_modified_by_hive: true }, { id: 4, _hive_modified_by_hive: true }]);
    });

    it('should upload only updated products', () => {
      const products = [{ id: 1 }, { id: 2, _hive_modified_by_hive: true }, { id: 3 }, { id: 4, _hive_modified_by_hive: true }, { id: 5 }];

      expect(shopifySyncShop.getProductsToUpload(products)).to.eql([{ id: 2, _hive_modified_by_hive: true }, { id: 4, _hive_modified_by_hive: true }]);
    });
  });

  describe('getProductsToDownload', () => {
    it('should get products with different timestamp', () => {
      const oldDate = moment('2017-03-09').toISOString();
      const newDate = moment('2017-06-09').toISOString();
      const shopifyProducts = [{ product_id: 1, updated_at: oldDate }, { product_id: 2, updated_at: newDate }, { product_id: 3, updated_at: oldDate }, { product_id: 4, updated_at: newDate }, { product_id: 5, updated_at: oldDate }];
      const velaProducts = [{ id: 11, product_id: 1, updated_at: oldDate }, { product_id: 2, id: 22, updated_at: oldDate }, { product_id: 3, id: 33, updated_at: oldDate }, { product_id: 4, id: 44, updated_at: oldDate }, { id: 5, vela_id: 55, updated_at: oldDate }];

      expect(shopifySyncShop.getProductsToDownload(shopifyProducts, velaProducts)).to.eql([{ product_id: 2, id: 22, updated_at: oldDate }, { product_id: 4, id: 44, updated_at: oldDate }]);
    });
  });

  describe('enqueueOperation', () => {
    it('should enqueue message', async () => {
      await shopifySyncShop.enqueueOperation(logger, { headers: { shopId: SHOP_ID } }, 'shopify.testOperation', 42, 1234);

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.channel-router', 'prefix.shopify.testOperation', { body: {}, headers: { type: 'prefix.shopify.testOperation', messageId: 'test new message id', total: 42, shopId: SHOP_ID, productId: 1234 }, stack: [] });
    });
  });

  describe('scheduleChildTasks', () => {
    let message;

    describe('should schedule tasks', () => {
      beforeEach(async () => {
        message = {
          headers: {
            total: 5
          },
          body: {
            response: {
              data: {
                products: [
                  { id: 1, updated_at: 1234567 },
                  { id: 2, updated_at: 2345678 },
                  { id: 3, updated_at: 3456789 },
                  { id: 4, updated_at: 4567890 },
                  { id: 5, updated_at: 5678901 }
                ]
              }
            }
          }
        };

        const shop = { id: SHOP_ID, name: 'test shop' };

        const velaProducts = [
          { id: 11, product_id: 1, updated_at: 1111111 },
          { id: 22, product_id: 2, updated_at: 1111111, _hive_is_invalid: true },
          { id: 33, product_id: 3, updated_at: 1111111 },
          { id: 44, product_id: 4, updated_at: 1234567, _hive_modified_by_hive: true },
          { id: 55, product_id: 5, updated_at: 1234567, _hive_modified_by_hive: true }
        ];
        models.shopifyProducts.getStatusSummariesByShopifyProductIds.returns(velaProducts);

        sandbox.stub(shopifySyncShop, 'getShop');
        sandbox.stub(shopifySyncShop, 'getLeftDifference');
        sandbox.stub(shopifySyncShop, 'getProductsToUpload');
        sandbox.stub(shopifySyncShop, 'getProductsToDownload');
        sandbox.stub(shopifySyncShop, 'enqueueOperation');
        sandbox.stub(shopifySyncShop, 'finishProductsBatch');
        shopifySyncShop.getShop.returns(shop);
        shopifySyncShop.getProductsToUpload.returns([{ id: 44, product_id: 4, updated_at: 1234567, _hive_modified_by_hive: true }, { id: 55, product_id: 5, updated_at: 1234567, _hive_modified_by_hive: true }]);
        shopifySyncShop.getProductsToDownload.returns([{ id: 11, product_id: 1, updated_at: 1111111 }, { id: 33, product_id: 3, updated_at: 1111111 }]);
        shopifySyncShop.enqueueOperation.returns(Promise.resolve());
      });

      it('should get vela products', async () => {
        await shopifySyncShop.scheduleChildTasks(logger, message);

        expect(models.shopifyProducts.getStatusSummariesByShopifyProductIds).to.have.been.calledOnce;
        expect(models.shopifyProducts.getStatusSummariesByShopifyProductIds).to.have.been.calledWithExactly(['1', '2', '3', '4', '5']);
      });

      it('should mark products as processed in sync shop table', async () => {
        await shopifySyncShop.scheduleChildTasks(logger, message);

        expect(models.syncShops.addProducts).to.have.been.calledOnce;
        expect(models.syncShops.addProducts).to.have.been.calledWithExactly(SHOP_ID, ['1', '2', '3', '4', '5']);
      });

      it('should update sync shop counters', async () => {
        await shopifySyncShop.scheduleChildTasks(logger, message);

        expect(models.shops.updateSyncCounters).to.have.been.calledOnce;
        expect(models.shops.updateSyncCounters).to.have.been.calledWithExactly(SHOP_ID, 2, 2);
      });

      it('should enqueue upload products operations', async () => {
        await shopifySyncShop.scheduleChildTasks(logger, message);

        expect(shopifySyncShop.enqueueOperation.callCount).to.eql(4);
        expect(shopifySyncShop.enqueueOperation).to.have.been.calledWithExactly(logger, message, 'shopify.uploadProduct', 4, 44);
        expect(shopifySyncShop.enqueueOperation).to.have.been.calledWithExactly(logger, message, 'shopify.uploadProduct', 4, 55);
      });

      it('should enqueue download products operations', async () => {
        await shopifySyncShop.scheduleChildTasks(logger, message);

        expect(shopifySyncShop.enqueueOperation.callCount).to.eql(4);
        expect(shopifySyncShop.enqueueOperation).to.have.been.calledWithExactly(logger, message, 'shopify.downloadProduct', 4, 11);
        expect(shopifySyncShop.enqueueOperation).to.have.been.calledWithExactly(logger, message, 'shopify.downloadProduct', 4, 33);
      });

      it('should finish batch if there is nothing to do', async () => {
        shopifySyncShop.getProductsToUpload.returns([]);
        shopifySyncShop.getProductsToDownload.returns([]);

        await shopifySyncShop.scheduleChildTasks(logger, message);

        expect(shopifySyncShop.enqueueOperation).to.not.have.been.called;
        expect(shopifySyncShop.finishProductsBatch).to.have.been.calledOnce;
        expect(shopifySyncShop.finishProductsBatch).to.have.been.calledWithExactly(logger, message, 1, 'success', null);
      });
    });
  });

  describe('finishSyncShop', () => {
    beforeEach(() => {
      sandbox.stub(shopifySyncShop, 'markShopSyncDone');
    });

    it('should mark shop as up-to-date', async () => {
      const message = {
        body: {
          results: [
            { status: 'success' },
            { status: 'success' },
            { status: 'success' }
          ]
        }
      };

      await shopifySyncShop.finishSyncShop(message, SHOP_ID);

      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledOnce;
      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledWithExactly(SHOP_ID, false, null);
    });

    it('should mark shop as incomplete', async () => {
      const message = {
        body: {
          results: [
            { status: 'success' },
            { status: 'error', message: 'test error message', messageId: '1234567890' },
            { status: 'success' }
          ]
        }
      };

      await shopifySyncShop.finishSyncShop(message, SHOP_ID);

      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledOnce;
      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledWithExactly(SHOP_ID, true, '1234567890:test error message');
    });
  });

  describe('getShop', () => {
    it('should return shop data', async () => {
      const shop = { id: SHOP_ID, channel_id: '2' };
      models.shops.getById.returns(shop);

      try {
        expect(await shopifySyncShop.getShop(logger, SHOP_ID)).to.eql(shop);
      } catch (error) {
        expect(false).to.be.true;
      }

      expect(models.shops.getById).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWithExactly(SHOP_ID);
    });

    it('should do nothing for shop from wrong channel', async () => {
      models.shops.getById.returns({ id: SHOP_ID, channel_id: '111' });

      try {
        await shopifySyncShop.getShop(logger, SHOP_ID);
        expect(false).to.be.true;
      } catch (error) {
        expect(true).to.be.true;
      }

      expect(models.shops.getById).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWithExactly(SHOP_ID);
    });
  });

  describe('subtasksCompleted', () => {
    let message;
    let shop;

    beforeEach(() => {
      message = { body: { shopId: SHOP_ID } };
      shop = { id: SHOP_ID, channel_id: '2' };

      sandbox.stub(shopifySyncShop, 'getShop');
      sandbox.stub(shopifySyncShop, 'deleteProducts');
      sandbox.stub(shopifySyncShop, 'finishSyncShop');

      shopifySyncShop.getShop.returns(shop);
    });

    it('should process tasks competed message', async () => {
      message.headers = { type: 'prefix.subtasksCompleted' };

      await shopifySyncShop.subtasksCompleted(logger, message);

      expect(shopifySyncShop.deleteProducts).to.have.been.calledOnce;
      expect(shopifySyncShop.deleteProducts).to.have.been.calledWithExactly(SHOP_ID);

      expect(models.syncShops.deleteByShopId).to.have.been.calledOnce;
      expect(models.syncShops.deleteByShopId).to.have.been.calledWithExactly(SHOP_ID);

      expect(shopifySyncShop.finishSyncShop).to.have.been.calledOnce;
      expect(shopifySyncShop.finishSyncShop).to.have.been.calledWithExactly(message, SHOP_ID);
    });
  });

  describe('processSyncShop', () => {
    let message;
    let shop;

    beforeEach(() => {
      message = { headers: { messageId: '1234567890', type: 'prefix.shopify.syncShop' }, body: { shopId: SHOP_ID } };
      shop = { id: SHOP_ID, channel_id: '2' };

      sandbox.stub(shopifySyncShop, 'canStartSyncShop');
      sandbox.stub(shopifySyncShop, 'getShop');
      sandbox.stub(shopifySyncShop, 'markShopInSync');
      sandbox.stub(shopifySyncShop, 'getProductsCount');
      sandbox.stub(shopifySyncShop, 'getShopInfo');

      shopifySyncShop.getShop.returns(shop);
    });

    it('should not start sync shop if it is already in progress', async () => {
      shopifySyncShop.canStartSyncShop.returns(false);

      await shopifySyncShop.processSyncShop('logger', message);

      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledOnce;
      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledWithExactly('logger', message, shop);

      expect(shopifySyncShop.markShopInSync).to.not.have.been.calledOnce;
      expect(shopifySyncShop.getProductsCount).to.not.have.been.calledOnce;
    });

    it('should not start sync shop if it is already in progress', async () => {
      shopifySyncShop.canStartSyncShop.returns(false);

      await shopifySyncShop.processSyncShop('logger', message);

      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledOnce;
      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledWithExactly('logger', message, shop);

      expect(shopifySyncShop.markShopInSync).to.not.have.been.calledOnce;
      expect(shopifySyncShop.getProductsCount).to.not.have.been.calledOnce;
    });

    it('should not start sync shop if another progress tries to start sync', async () => {
      shopifySyncShop.canStartSyncShop.returns(true);
      shopifySyncShop.markShopInSync.throws();

      try {
        await shopifySyncShop.processSyncShop('logger', message);
        expect(false).to.be.true;
      } catch (error) {
        expect(true).to.be.true;
      }

      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledOnce;
      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledWithExactly('logger', message, shop);

      expect(shopifySyncShop.markShopInSync).to.have.been.calledOnce;
      expect(shopifySyncShop.getProductsCount).to.not.have.been.calledOnce;
    });

    it('should clear aggregates and syncShops on sync shop', async () => {
      shopifySyncShop.canStartSyncShop.returns(true);

      await shopifySyncShop.processSyncShop('logger', message);

      expect(models.syncShops.deleteByShopId).to.have.been.calledOnce;
      expect(models.syncShops.deleteByShopId).to.have.been.calledWithExactly(SHOP_ID);

      expect(models.aggregates.deleteByParentMessageId).to.have.been.calledOnce;
      expect(models.aggregates.deleteByParentMessageId).to.have.been.calledWithExactly('1234567890');
    });

    it('should start sync shop', async () => {
      shopifySyncShop.canStartSyncShop.returns(true);

      await shopifySyncShop.processSyncShop('logger', message);

      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledOnce;
      expect(shopifySyncShop.canStartSyncShop).to.have.been.calledWithExactly('logger', message, shop);

      expect(shopifySyncShop.markShopInSync).to.have.been.calledOnce;

      expect(shopifySyncShop.getProductsCount).to.have.been.calledOnce;
      expect(shopifySyncShop.getProductsCount).to.have.been.calledWithExactly('logger', message, shop);
    });

    it('should schedule shop info', async () => {
      shopifySyncShop.canStartSyncShop.returns(true);

      await shopifySyncShop.processSyncShop('logger', message);

      expect(shopifySyncShop.getShopInfo).to.have.been.calledOnce;
      expect(shopifySyncShop.getShopInfo).to.have.been.calledWithExactly('logger', message, shop);
    });
  });

  describe('processCompletedProductsBatch', () => {
    let message;

    beforeEach(() => {
      message = {
        headers: {
          messageId: '1234567890',
          type: 'shopify.syncShop.getProducts.subtasksCompleted',
          shopId: SHOP_ID,
          total: 3,
          batches: 2
        },
        body: {
        }
      };

      sandbox.stub(shopifySyncShop, 'getCombinedErrorMessage');
      sandbox.stub(shopifySyncShop, 'finishProductsBatch');
    });

    it('should get combined message', async () => {
      await shopifySyncShop.processCompletedProductsBatch(logger, message);

      expect(shopifySyncShop.getCombinedErrorMessage).to.have.been.calledOnce;
      expect(shopifySyncShop.getCombinedErrorMessage).to.have.been.calledWithExactly(message);
    });

    it('should finish batch', async () => {
      shopifySyncShop.getCombinedErrorMessage.returns(null);

      await shopifySyncShop.processCompletedProductsBatch(logger, message);

      expect(shopifySyncShop.finishProductsBatch).to.have.been.calledOnce;
      expect(shopifySyncShop.finishProductsBatch).to.have.been.calledWithExactly(logger, message, 2, 'success', null);
    });

    it('should finish batch with error', async () => {
      shopifySyncShop.getCombinedErrorMessage.returns('error message');

      await shopifySyncShop.processCompletedProductsBatch(logger, message);

      expect(shopifySyncShop.finishProductsBatch).to.have.been.calledOnce;
      expect(shopifySyncShop.finishProductsBatch).to.have.been.calledWithExactly(logger, message, 2, 'error', 'error message');
    });
  });

  describe('getCombinedErrorMessage', () => {
    let message;

    beforeEach(() => {
      message = {
        headers: {
          messageId: '1234567890',
          type: 'shopify.syncShop.getProducts.subtasksCompleted',
          shopId: SHOP_ID,
          total: 3,
          batches: 2
        },
        body: {}
      };
    });

    it('should return null', () => {
      message.body.results = [
        { status: 'success', messageId: '123', message: null },
        { status: 'success', messageId: '234', message: null },
        { status: 'success', messageId: '345', message: null }
      ];

      const result = shopifySyncShop.getCombinedErrorMessage(message);

      expect(result).to.eql(null);
    });

    it('should return error message', () => {
      message.body.results = [
        { status: 'success', messageId: '123', message: null },
        { status: 'error', messageId: '234', message: 'test error' },
        { status: 'success', messageId: '345', message: null }
      ];

      const result = shopifySyncShop.getCombinedErrorMessage(message);

      expect(result).to.eql('234:test error');
    });
  });

  describe('process', () => {
    let message;
    let shop;

    beforeEach(() => {
      message = { body: { shopId: SHOP_ID } };
      shop = { id: SHOP_ID, channel_id: '2' };

      sandbox.stub(shopifySyncShop, 'getProducts');
      sandbox.stub(shopifySyncShop, 'scheduleChildTasks');
      sandbox.stub(shopifySyncShop, 'subtasksCompleted');
      sandbox.stub(shopifySyncShop, 'processSyncShop');
      sandbox.stub(shopifySyncShop, 'processError');

      models.shops.getById.returns(shop);
    });

    it('should process initial message', async () => {
      message.headers = { type: 'prefix.shopify.syncShop' };
      await shopifySyncShop.process(logger, message);

      expect(shopifySyncShop.processSyncShop).to.have.been.calledOnce;
    });

    it('should process getProductsCount API call', async () => {
      message.headers = { type: 'prefix.shopify.syncShop.count' };

      await shopifySyncShop.process(logger, message);

      expect(shopifySyncShop.getProducts).to.have.been.calledOnce;
    });

    it('should process getProducts API call', async () => {
      message.headers = { type: 'prefix.shopify.syncShop.getProducts' };

      await shopifySyncShop.process(logger, message);

      expect(shopifySyncShop.scheduleChildTasks).to.have.been.calledOnce;
    });

    it('should process tasks competed message', async () => {
      message.headers = { type: 'prefix.shopify.syncShop.subtasksCompleted' };

      await shopifySyncShop.process(logger, message);

      expect(shopifySyncShop.subtasksCompleted).to.have.been.calledOnce;
    });

    it('should process error message', async () => {
      message.headers = { type: 'prefix.shopify.syncShop.error' };

      await shopifySyncShop.process(logger, message);

      expect(shopifySyncShop.processError).to.have.been.calledOnce;
    });
  });

  describe('processError', () => {
    let message;

    beforeEach(() => {
      message = { headers: { shopId: SHOP_ID }, body: { error: 'test error' } };

      sandbox.stub(shopifySyncShop, 'markShopSyncDone');
    });

    it('should mark shop as incomplete', async () => {
      await shopifySyncShop.processError(logger, message);

      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledOnce;
      expect(shopifySyncShop.markShopSyncDone).to.have.been.calledWithExactly(SHOP_ID, true, 'test error');
    });
  });

  describe('updateShop', () => {
    beforeEach(() => {
      sandbox.stub(shopifySyncShop, 'getShop');
    });

    it('should update shop name', async () => {
      const message = {
        headers: { shopId: SHOP_ID },
        body: { response: { data: { shop: { name: 'new name', myshopify_domain: 'domain' } } } }
      };
      shopifySyncShop.getShop.returns({ name: 'old name', domain: 'domain' });

      await shopifySyncShop.updateShop(logger, message);

      expect(models.shops.updateShopName).to.have.been.called;
      expect(models.shops.updateShopName).to.have.been.calledWithExactly(SHOP_ID, 'new name');
      expect(models.shops.updateShopDomain).to.not.have.been.called;
    });

    it('should update shop domain', async () => {
      const message = {
        headers: { shopId: SHOP_ID },
        body: { response: { data: { shop: { name: 'old name', myshopify_domain: 'new domain' } } } }
      };

      shopifySyncShop.getShop.returns({ name: 'old name' });

      await shopifySyncShop.updateShop(logger, message);

      expect(models.shops.updateShopName).to.not.have.been.called;
      expect(models.shops.updateShopDomain).to.have.been.called;
      expect(models.shops.updateShopDomain).to.have.been.calledWithExactly(SHOP_ID, 'new domain');
    });

    it('should log API error', async () => {
      const message = {
        headers: { shopId: SHOP_ID },
        body: { response: { data: { status: 401, response: { text: 'bad token' } } } }
      };

      await shopifySyncShop.updateShop(logger, message);

      expect(logger.error).to.have.been.calledWithExactly('Couldn\'t retrieve shop info: bad token');

      expect(models.shops.updateShopName).to.not.have.been.called;
      expect(models.shops.updateShopDomain).to.not.have.been.called;
    });
  });
});
