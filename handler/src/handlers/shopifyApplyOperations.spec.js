import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { fromJS } from 'immutable';

import ShopifyApplyOperations from './shopifyApplyOperations';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

const SHOP_ID = 123;
const PRODUCT_ID = 11;

describe('ShopifyApplyOperations', () => {
  let models;
  let rabbit;
  let message;
  let messageUtils;
  let shopifyApplyOperations;
  let moment;

  beforeEach(() => {
    rabbit = {
      getPrefixedName: value => value ? `prefix.${value}` : value,
      publish: sinon.stub()
    };

    models = {
      shops: {
        incrementApplyProgress: sinon.stub(),
        applyFinished: sinon.stub()
      },
      shopifyProducts: {
        getById: sinon.stub(),
        upsert: sinon.stub()
      }
    };

    message = {
      headers: {
        type: 'test.message',
        messageId: '0123456789',
        shopId: SHOP_ID,
        total: 42
      },
      stack: [{ type: 'prefix.shopify.syncShop', messageId: '3456789012', shopId: SHOP_ID }, { type: 'some.other.type', messageId: '4567890123', shopId: SHOP_ID }],
      body: {
        operations: [{op: 1}, {op: 2}],
        productId: PRODUCT_ID
      }
    };

    moment = () => ({toISOString: () => '1970-01-01'});
    ShopifyApplyOperations.__Rewire__('moment', moment);

    messageUtils = ShopifyApplyOperations.__get__('messageUtils');
    sandbox.stub(messageUtils, 'getNewMessageId');
    messageUtils.getNewMessageId.returns('test message id');

    shopifyApplyOperations = new ShopifyApplyOperations(null, models, rabbit);
  });

  afterEach(() => {
    ShopifyApplyOperations.__ResetDependency__('moment');
    sandbox.restore();
  });

  describe('getOpType', () => {
    it('should get op type', () => {
      expect(shopifyApplyOperations.getOpType('test.type')).to.eql('test');
      expect(shopifyApplyOperations.getOpType('testtype')).to.eql('testtype');
    });
  });

  describe('getProductFields', () => {
    beforeEach(() => {
      sandbox.stub(shopifyApplyOperations, 'getOpType');
      shopifyApplyOperations.getOpType.onCall(0).returns('foo');
      shopifyApplyOperations.getOpType.onCall(1).returns('bar');
      shopifyApplyOperations.getOpType.onCall(2).returns('foo');
    });

    it('should alwasy get basic fields (id, productId, shopId)', () => {
      expect(shopifyApplyOperations.getProductFields()).to.eql(['id', 'shop_id', 'product_id']);
    });

    it('should get unique field set from operations', () => {
      const operations = [{type: 1}, {type: 2}, {type: 3}];
      expect(shopifyApplyOperations.getProductFields(operations)).to.eql(['foo', 'bar', 'id', 'shop_id', 'product_id']);
      expect(shopifyApplyOperations.getOpType).to.have.been.calledThrice;
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly(1);
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly(2);
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly(3);
    });
  });

  describe('storeImages', () => {
    beforeEach(() => {
      sandbox.stub(shopifyApplyOperations, 'addNewImages');
      sandbox.stub(shopifyApplyOperations, 'updatePhotoOpValue');
    });

    it('should add new image for photos.add operation', async () => {
      shopifyApplyOperations.addNewImages.returns({ qwertyuiop: 1 });
      shopifyApplyOperations.updatePhotoOpValue.returns([1]);

      const operations = await shopifyApplyOperations.storeImages(SHOP_ID, [{ type: 'photos.add', value: [{ hash: 'qwertyuiop', mime: 'nothing' }] }]);

      expect(operations).to.eql([{ type: 'photos.add', value: [1] }]);
    });

    it('should add new image for photos.replace opereration', async () => {
      shopifyApplyOperations.addNewImages.returns({ qwertyuiop: 1 });
      shopifyApplyOperations.updatePhotoOpValue.returns([null, 1]);

      const operations = await shopifyApplyOperations.storeImages(SHOP_ID, [{ type: 'photos.replace', value: [{ hash: 'qwertyuiop', mime: 'nothing' }] }]);

      expect(operations).to.eql([{ type: 'photos.replace', value: [null, 1] }]);
    });

    it('should do nothing if there are no photos operations', async () => {
      const operations = await shopifyApplyOperations.storeImages(SHOP_ID, [{ type: 'test op' }]);

      expect(operations).to.eql([{ type: 'test op' }]);
    });
  });

  describe('doApplyOperations', () => {
    let getHandlersByChannelId;

    beforeEach(() => {
      getHandlersByChannelId = sinon.stub();
      ShopifyApplyOperations.__Rewire__('getHandlersByChannelId', getHandlersByChannelId);

      sandbox.stub(shopifyApplyOperations, 'getOpType');
      shopifyApplyOperations.getOpType.onCall(0).returns('foo');
      shopifyApplyOperations.getOpType.onCall(1).returns('bar');
    });

    afterEach(() => {
      ShopifyApplyOperations.__ResetDependency__('getHandlersByChannelId');
    });

    it('should apply operations', () => {
      const product = { title: 'test title', id: PRODUCT_ID };
      const operations = [ { type: 'foo.test', value: 'val1', products: [PRODUCT_ID] }, { type: 'bar.test', value: 'val2', products: [PRODUCT_ID] } ];
      const handlers = {
        foo: { apply: sinon.stub().returns(fromJS({ updated: 1 })), validate: sinon.stub().returns(fromJS({ valid: true })) },
        bar: { apply: sinon.stub().returns(fromJS({ updated: 2 })), validate: sinon.stub().returns(fromJS({ valid: true })) }
      };
      getHandlersByChannelId.returns(handlers);

      const result = shopifyApplyOperations.doApplyOperations(product, operations);

      expect(getHandlersByChannelId).to.have.been.calledWithExactly(2);
      expect(shopifyApplyOperations.getOpType).to.have.been.calledTwice;
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly('foo.test');
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly('bar.test');

      expect(handlers.foo.apply).to.have.been.calledOnce;
      expect(handlers.foo.apply.args[0][0].toJS()).to.eql({ title: 'test title', id: PRODUCT_ID });
      expect(handlers.foo.apply.args[0][1]).to.eql('foo.test');
      expect(handlers.foo.apply.args[0][2]).to.eql('val1');
      expect(handlers.foo.apply.args[0][3]).to.be.true;

      expect(handlers.bar.apply).to.have.been.calledOnce;
      expect(handlers.bar.apply.args[0][0].toJS()).to.eql({ updated: 1 });
      expect(handlers.bar.apply.args[0][1]).to.eql('bar.test');
      expect(handlers.bar.apply.args[0][2]).to.eql('val2');
      expect(handlers.bar.apply.args[0][3]).to.be.true;

      expect(result).to.eql({ updated: 2 });
    });

    it('should skip invalid results of apply operations', () => {
      const product = { title: 'test title', id: PRODUCT_ID };
      const operations = [ { type: 'foo.test', value: 'val1', products: [PRODUCT_ID] }, { type: 'bar.test', value: 'val2', products: [PRODUCT_ID] } ];
      const handlers = {
        foo: { apply: sinon.stub().returns(fromJS({ updated: 1 })), validate: sinon.stub().returns(fromJS({ valid: true })) },
        bar: { apply: sinon.stub().returns(fromJS({ updated: 2 })), validate: sinon.stub().returns(fromJS({ valid: false })) }
      };
      getHandlersByChannelId.returns(handlers);

      const result = shopifyApplyOperations.doApplyOperations(product, operations);

      expect(getHandlersByChannelId).to.have.been.calledWithExactly(2);
      expect(shopifyApplyOperations.getOpType).to.have.been.calledTwice;
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly('foo.test');
      expect(shopifyApplyOperations.getOpType).to.have.been.calledWithExactly('bar.test');

      expect(handlers.foo.apply).to.have.been.calledOnce;
      expect(handlers.foo.apply.args[0][0].toJS()).to.eql({ title: 'test title', id: PRODUCT_ID });
      expect(handlers.foo.apply.args[0][1]).to.eql('foo.test');
      expect(handlers.foo.apply.args[0][2]).to.eql('val1');
      expect(handlers.foo.apply.args[0][3]).to.be.true;

      expect(handlers.bar.apply).to.have.been.calledOnce;
      expect(handlers.bar.apply.args[0][0].toJS()).to.eql({ updated: 1 });
      expect(handlers.bar.apply.args[0][1]).to.eql('bar.test');
      expect(handlers.bar.apply.args[0][2]).to.eql('val2');
      expect(handlers.bar.apply.args[0][3]).to.be.true;

      expect(result).to.eql({ updated: 1 });
    });

    it('should throw if operation handler does not exist', () => {
      const product = fromJS({ title: 'test title' });
      const operations = [ { type: 'foo.test', value: 'val1' } ];
      getHandlersByChannelId.returns({});

      try {
        shopifyApplyOperations.doApplyOperations(product, operations);
        expect(false).to.be.true;
      } catch (err) {
        expect(true).to.be.true;
      }
    });
  });

  describe('getChangedProperties', () => {
    it('should get changed properties', () => {
      const product = { title: 'foo', body_html: 'bar' };
      const updatedProduct = { title: 'fooo', body_html: 'barr' };

      expect(shopifyApplyOperations.getChangedProperties(product, updatedProduct)).to.eql(['title', 'body_html']);
    });

    it('should get added properties', () => {
      const product = { title: 'foo' };
      const updatedProduct = { title: 'foo', body_html: 'bar' };

      expect(shopifyApplyOperations.getChangedProperties(product, updatedProduct)).to.eql(['body_html']);
    });

    it('should get removed properties', () => {
      const product = { title: 'foo', body_html: 'bar' };
      const updatedProduct = { title: 'foo' };

      expect(shopifyApplyOperations.getChangedProperties(product, updatedProduct)).to.eql(['body_html']);
    });
  });

  describe('incrementApplyCounter', async () => {
    await shopifyApplyOperations.incrementApplyCounter(logger, message);

    expect(models.shops.incrementApplyProgress).to.have.been.calledWithExactly(SHOP_ID, 1);
  });

  describe('finishTask', () => {
    it('should enqueue message', async () => {
      await shopifyApplyOperations.finishTask(logger, message, 'status', 'statusMessage');

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-aggregate', '', {
        body: {
          status: 'status',
          message: 'statusMessage'
        },
        headers: {
          type: '',
          messageId: '0123456789',
          shopId: SHOP_ID,
          total: 42
        },
        stack: [{ type: 'prefix.shopify.syncShop', messageId: '3456789012', shopId: SHOP_ID }, { type: 'some.other.type', messageId: '4567890123', shopId: SHOP_ID }]
      });
    });
  });

  describe('process', () => {
    let product;
    let updatedProduct;

    describe('successfully apply operations', async () => {
      beforeEach(async () => {
        sandbox.stub(shopifyApplyOperations, 'getProductFields');
        shopifyApplyOperations.getProductFields.returns(['title', 'body_html', 'some_field']);

        product = { title: 'foo', body_html: 'bar' };
        models.shopifyProducts.getById.returns(product);

        sandbox.stub(shopifyApplyOperations, 'storeImages');
        shopifyApplyOperations.storeImages.returns(message.body.operations);

        updatedProduct = { title: 'fooooo', body_html: 'baaaar' };
        sandbox.stub(shopifyApplyOperations, 'doApplyOperations');
        shopifyApplyOperations.doApplyOperations.returns(updatedProduct);

        sandbox.stub(shopifyApplyOperations, 'getChangedProperties');
        shopifyApplyOperations.getChangedProperties.returns(['title', 'body_html']);

        sandbox.stub(shopifyApplyOperations, 'incrementApplyCounter');
        sandbox.stub(shopifyApplyOperations, 'finishTask');

        await shopifyApplyOperations.process(logger, message);
      });

      it('should get product', () => {
        expect(models.shopifyProducts.getById).to.have.been.calledOnce;
        expect(models.shopifyProducts.getById).to.have.been.calledWithExactly(PRODUCT_ID, ['title', 'body_html', 'some_field']);
      });

      it('should apply operations', () => {
        expect(shopifyApplyOperations.doApplyOperations).to.have.been.calledOnce;
        expect(shopifyApplyOperations.doApplyOperations).to.have.been.calledWithExactly(product, [{op: 1}, {op: 2}]);
      });

      it('should get changed properties', () => {
        expect(shopifyApplyOperations.getChangedProperties).to.have.been.calledOnce;
        expect(shopifyApplyOperations.getChangedProperties).to.have.been.calledWithExactly(product, updatedProduct);
      });

      it('should store updated product', () => {
        expect(models.shopifyProducts.upsert).to.have.been.calledOnce;
        expect(models.shopifyProducts.upsert).to.have.been.calledWithExactly({
          ...updatedProduct,
          _hive_modified_by_hive: true,
          changed_properties: ['title', 'body_html'],
          _hive_updated_at: '1970-01-01'
        });
      });

      it('should increment apply counter', () => {
        expect(shopifyApplyOperations.incrementApplyCounter).to.have.been.calledOnce;
        expect(shopifyApplyOperations.incrementApplyCounter).to.have.been.calledWithExactly(logger, message);
      });

      it('should finish task', () => {
        expect(shopifyApplyOperations.finishTask).to.have.been.calledOnce;
        expect(shopifyApplyOperations.finishTask).to.have.been.calledWithExactly(logger, message, 'success');
      });
    });

    describe('do nothing if nothing changed', async () => {
      beforeEach(async () => {
        sandbox.stub(shopifyApplyOperations, 'getProductFields');
        shopifyApplyOperations.getProductFields.returns(['title', 'body_html', 'some_field']);

        product = { title: 'foo', body_html: 'bar' };
        models.shopifyProducts.getById.returns(product);

        sandbox.stub(shopifyApplyOperations, 'storeImages');
        shopifyApplyOperations.storeImages.returns(message.body.operations);

        updatedProduct = { title: 'fooooo', body_html: 'baaaar' };
        sandbox.stub(shopifyApplyOperations, 'doApplyOperations');
        shopifyApplyOperations.doApplyOperations.returns(updatedProduct);

        sandbox.stub(shopifyApplyOperations, 'getChangedProperties');
        shopifyApplyOperations.getChangedProperties.returns([]);

        sandbox.stub(shopifyApplyOperations, 'incrementApplyCounter');
        sandbox.stub(shopifyApplyOperations, 'finishTask');

        await shopifyApplyOperations.process(logger, message);
      });

      it('should get product', () => {
        expect(models.shopifyProducts.getById).to.have.been.calledOnce;
        expect(models.shopifyProducts.getById).to.have.been.calledWithExactly(PRODUCT_ID, ['title', 'body_html', 'some_field']);
      });

      it('should store images', () => {
        expect(shopifyApplyOperations.storeImages).to.have.been.calledOnce;
        expect(shopifyApplyOperations.storeImages).to.have.been.calledWithExactly(SHOP_ID, [{op: 1}, {op: 2}]);
      });

      it('should apply operations', () => {
        expect(shopifyApplyOperations.doApplyOperations).to.have.been.calledOnce;
        expect(shopifyApplyOperations.doApplyOperations).to.have.been.calledWithExactly(product, [{op: 1}, {op: 2}]);
      });

      it('should get changed properties', () => {
        expect(shopifyApplyOperations.getChangedProperties).to.have.been.calledOnce;
        expect(shopifyApplyOperations.getChangedProperties).to.have.been.calledWithExactly(product, updatedProduct);
      });

      it('should not store updated product', () => {
        expect(models.shopifyProducts.upsert).to.not.have.been.called;
      });

      it('should increment apply counter', () => {
        expect(shopifyApplyOperations.incrementApplyCounter).to.have.been.calledOnce;
        expect(shopifyApplyOperations.incrementApplyCounter).to.have.been.calledWithExactly(logger, message);
      });

      it('should finish task', () => {
        expect(shopifyApplyOperations.finishTask).to.have.been.calledOnce;
        expect(shopifyApplyOperations.finishTask).to.have.been.calledWithExactly(logger, message, 'success');
      });
    });

    it('should finish task if apply failed', async () => {
      sandbox.stub(shopifyApplyOperations, 'getProductFields');
      shopifyApplyOperations.getProductFields.throws('test error');

      sandbox.stub(shopifyApplyOperations, 'finishTask');

      await shopifyApplyOperations.process(logger, message);

      expect(shopifyApplyOperations.finishTask).to.have.been.calledOnce;
      expect(shopifyApplyOperations.finishTask).to.have.been.calledWith(logger, message, 'error');
    });
  });
});
