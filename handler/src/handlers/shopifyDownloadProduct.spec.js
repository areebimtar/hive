import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import ShopifyDownloadProduct from './shopifyDownloadProduct';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

describe('shopifyDownloadProduct', () => {
  let config;
  let models;
  let rabbit;
  let Shopify;
  let getDownloadProductMessage;
  let convertListingToProduct;
  let messageUtils;

  beforeEach(() => {
    config = {
      retries: 2
    };

    messageUtils = ShopifyDownloadProduct.__get__('messageUtils');
    sandbox.stub(messageUtils, 'getNewMessageId');
    messageUtils.getNewMessageId.returns('new test message id');

    getDownloadProductMessage = sinon.stub().returns('test message');
    Shopify = function dummyShopify() {
      this.getDownloadProductMessage = getDownloadProductMessage;
    };
    ShopifyDownloadProduct.__Rewire__('Shopify', Shopify);

    convertListingToProduct = sinon.stub();
    ShopifyDownloadProduct.__Rewire__('convertListingToProduct', convertListingToProduct);

    rabbit = {
      getPrefixedName: value => value ? `prefix.${value}` : value,
      publish: sinon.stub()
    };

    models = {
      shopifyProducts: {
        getById: sinon.stub(),
        upsert: sinon.stub()
      },
      shops: {
        getById: sinon.stub(),
        downloadProductFinished: sinon.stub()
      },
      images: {
        getByShopId: sinon.stub(),
        upsert: sinon.stub()
      }
    };
  });

  afterEach(() => {
    ShopifyDownloadProduct.__ResetDependency__('Shopify');
    ShopifyDownloadProduct.__ResetDependency__('convertListingToProduct');

    sandbox.restore();
  });

  describe('downloadProduct', () => {
    beforeEach(async () => {
      const message = {
        headers: {
          messageId: 'test message id',
          shopId: 123,
          total: 42,
          productId: 12345
        },
        body: {
        }
      };

      models.shopifyProducts.getById.returns({ shop_id: 123, product_id: 234 });
      models.shops.getById.returns({ id: 123, name: 'test shop', domain: 'test-name.myshopify.com' });

      const shopifyDownloadProduct = new ShopifyDownloadProduct(config, models, rabbit);
      await shopifyDownloadProduct.downloadProduct(logger, message);
    });

    it('should get product', async () => {
      expect(models.shopifyProducts.getById).to.have.been.calledOnce;
      expect(models.shopifyProducts.getById).to.have.been.calledWithExactly(12345);
    });

    it('should get shop', async () => {
      expect(models.shops.getById).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWithExactly(123);
    });

    it('should enqueue message', async () => {
      expect(getDownloadProductMessage).to.have.been.calledOnce;
      expect(getDownloadProductMessage).to.have.been.calledWithExactly('test-name.myshopify.com', 234);

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.downloadProduct.APICall', {
        body: {
          request: 'test message'
        },
        headers: { messageId: 'test message id', shopId: 123, type: 'prefix.shopify.downloadProduct.APICall', total: 42 },
        stack: []
      });
    });
  });

  describe('finishTask', () => {
    beforeEach(async () => {
      const message = {
        headers: {
          type: 'test.opType',
          shopId: 123,
          messageId: '1234567890',
          total: 42
        },
        body: {},
        stack: [{ test: 'stack' }]
      };

      const shopifyDownloadProduct = new ShopifyDownloadProduct(config, models, rabbit);
      await shopifyDownloadProduct.finishTask(logger, message, 'test status', 'test result message');
    });

    it('should update shop counter', async () => {
      expect(models.shops.downloadProductFinished).to.have.been.calledOnce;
      expect(models.shops.downloadProductFinished).to.have.been.calledWithExactly(123);
    });

    it('should enqueue message', async () => {
      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-aggregate', '', {
        body: {
          status: 'test status',
          message: 'test result message'
        },
        headers: {
          type: '',
          messageId: '1234567890',
          shopId: 123,
          total: 42
        },
        stack: [{ test: 'stack' }]
      });
    });
  });

  describe('updateImages', () => {
    it('should return image id for existing images in hive', async () => {
      models.images.getByShopId.returns([{ id: 1, channel_image_id: '101' }, { id: 2, channel_image_id: '102' }]);
      const product = {
        photos: [{id: 101, src: 'img1_url'}, {id: 102, src: 'img2_url'}]
      };
      const message = {
        headers: {
          messageId: 'test message id',
          type: 'test.opType',
          shopId: 123
        },
        body: { response: { data: { product } } },
        stack: []
      };

      const shopifyDownloadProduct = new ShopifyDownloadProduct(config, models, rabbit);
      const imageIds = await shopifyDownloadProduct.updateImages(logger, message, product);

      expect(imageIds).to.eql([1, 2]);
      expect(models.images.upsert).to.not.have.been.called;
    });

    it('should insert new image and return ids', async () => {
      models.images.getByShopId.returns([{ id: 2, channel_image_id: '102' }]);
      models.images.upsert.returns(3);
      const product = {
        photos: [{id: 101, src: 'img1_url'}, {id: 102, src: 'img2_url'}]
      };
      const message = {
        headers: {
          messageId: 'test message id',
          type: 'test.opType',
          shopId: 123
        },
        body: { response: { data: { product } } },
        stack: []
      };

      const shopifyDownloadProduct = new ShopifyDownloadProduct(config, models, rabbit);
      const imageIds = await shopifyDownloadProduct.updateImages(logger, message, product);

      expect(imageIds).to.eql([3, 2]);

      expect(models.images.upsert).to.have.been.calledOnce;
      expect(models.images.upsert).to.have.been.calledWithExactly({
        shop_id: 123,
        channel_image_id: 101,
        fullsize_url: 'img1_url',
        thumbnail_url: 'img1_url'
      });
    });
  });

  describe('processAPICallResponse', () => {
    it('should store/update product in DB', async () => {
      const message = {
        headers: { shopId: 123 },
        body: { response: { status: 200, data: { product: { title: 'test listing data' } } } }
      };
      convertListingToProduct.returns({ title: 'test product data' });

      const shopifyDownloadProduct = new ShopifyDownloadProduct(config, models, rabbit);
      sandbox.stub(shopifyDownloadProduct, 'updateImages');
      sandbox.stub(shopifyDownloadProduct, 'finishTask');
      shopifyDownloadProduct.updateImages.returns(['testImageId']);
      await shopifyDownloadProduct.processAPICallResponse(logger, message);

      expect(convertListingToProduct).to.have.been.calledOnce;
      expect(convertListingToProduct).to.have.been.calledWithExactly({ title: 'test listing data' });

      expect(shopifyDownloadProduct.updateImages).to.have.been.calledOnce;

      expect(models.shopifyProducts.upsert).to.have.been.calledOnce;
      expect(models.shopifyProducts.upsert).to.have.been.calledWithExactly({ title: 'test product data', shop_id: 123, photos: ['testImageId'] });

      expect(shopifyDownloadProduct.finishTask).to.have.been.calledOnce;
      expect(shopifyDownloadProduct.finishTask).to.have.been.calledWithExactly(logger, message, 'success');
    });

    it('should retry task on error', async () => {
      const message = {
        headers: { shopId: 123 },
        body: { response: { status: 500, data: 'internal server error' } }
      };

      const shopifyDownloadProduct = new ShopifyDownloadProduct(config, models, rabbit);
      sandbox.stub(shopifyDownloadProduct, 'retryTaskOrFail');
      await shopifyDownloadProduct.processAPICallResponse(logger, message);

      expect(shopifyDownloadProduct.retryTaskOrFail).to.have.been.calledOnce;
      expect(shopifyDownloadProduct.retryTaskOrFail).to.have.been.calledWithExactly(logger, message);
    });
  });

  describe('process', () => {
    let shopifyAPICall;

    beforeEach(() => {
      shopifyAPICall = new ShopifyDownloadProduct(config, null, rabbit);
      sandbox.stub(shopifyAPICall, 'processAPICallResponse');
      sandbox.stub(shopifyAPICall, 'downloadProduct');
      sandbox.stub(shopifyAPICall, 'retryTaskOrFail');
    });

    it('should process API call response', async () => {
      const message = { headers: { type: 'prefix.shopify.downloadProduct.APICall' } };
      await shopifyAPICall.process(logger, message);

      expect(shopifyAPICall.processAPICallResponse).to.have.been.calledOnce;
      expect(shopifyAPICall.processAPICallResponse.args[0][1]).to.eql(message);
    });

    it('should download product', async () => {
      const message = { headers: { type: 'prefix.shopify.downloadProduct' } };
      await shopifyAPICall.process(logger, message);

      expect(shopifyAPICall.downloadProduct).to.have.been.calledOnce;
      expect(shopifyAPICall.downloadProduct.args[0][1]).to.eql(message);
    });


    it('should handle error message', async () => {
      const message = { headers: { type: 'prefix.shopify.downloadProduct.error' } };
      await shopifyAPICall.process(logger, message);

      expect(shopifyAPICall.retryTaskOrFail).to.have.been.calledOnce;
      expect(shopifyAPICall.retryTaskOrFail.args[0][1]).to.eql(message);
    });
  });

  describe('retryTaskOrFail', () => {
    let shopifyAPICall;

    beforeEach(() => {
      shopifyAPICall = new ShopifyDownloadProduct(config, null, rabbit);
      sandbox.stub(shopifyAPICall, 'finishTask');
      sandbox.stub(shopifyAPICall, 'downloadProduct');
    });

    it('should retry download task', async () => {
      const message = { headers: { type: 'prefix.shopify.downloadProduct.APICall' }, body: { response: { data: 'test error' } } };
      await shopifyAPICall.retryTaskOrFail(logger, message);

      expect(shopifyAPICall.downloadProduct).to.have.been.calledOnce;
      expect(shopifyAPICall.downloadProduct).to.have.been.calledWithExactly(logger, { headers: { type: 'prefix.shopify.downloadProduct.APICall', retries: 1 }, body: { response: { data: 'test error' } } });
    });

    it('should finish task', async () => {
      const message = { headers: { type: 'prefix.shopify.downloadProduct.APICall', retries: 2 }, body: { response: { data: 'test error' } } };
      await shopifyAPICall.retryTaskOrFail(logger, message);

      expect(shopifyAPICall.finishTask).to.have.been.calledOnce;
      expect(shopifyAPICall.finishTask).to.have.been.calledWithExactly(logger, message, 'error', 'test error');
    });
  });
});
