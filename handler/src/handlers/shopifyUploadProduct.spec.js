import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Promise from 'bluebird';

import ShopifyUploadProduct from './shopifyUploadProduct';
import logger from 'logger';

chai.use(sinonChai);

const sandbox = sinon.createSandbox({});

describe('shopifyUploadProduct', () => {
  let config;
  let models;
  let rabbit;
  let Shopify;
  let getUploadProductMessage;
  let convertProductToListing;
  let bucketGetImageUrl;

  beforeEach(() => {
    config = {
      retries: 2
    };

    getUploadProductMessage = sinon.stub().returns('test message');
    Shopify = function dummyShopify() {
      this.getUploadProductMessage = getUploadProductMessage;
    };
    ShopifyUploadProduct.__Rewire__('Shopify', Shopify);

    convertProductToListing = sinon.stub();
    ShopifyUploadProduct.__Rewire__('convertProductToListing', convertProductToListing);

    bucketGetImageUrl = sinon.stub();
    const S3Images = function S3ImagesStub() {
      this.getImageUrl = bucketGetImageUrl;
    };
    ShopifyUploadProduct.__Rewire__('S3Images', S3Images);

    rabbit = {
      getPrefixedName: value => value ? `prefix.${value}` : value,
      publish: sinon.stub()
    };

    models = {
      shopifyProducts: {
        getById: sinon.stub(),
        upsert: sinon.stub(),
        update: sinon.stub(),
        getByListingId: sinon.stub()
      },
      shops: {
        getById: sinon.stub(),
        uploadProductFinished: sinon.stub()
      },
      compositeRequests: {
        getImagesByIds: sinon.stub()
      },
      images: {
        upsert: sinon.stub(),
        getByShopId: sinon.stub()
      }
    };
  });

  afterEach(() => {
    ShopifyUploadProduct.__ResetDependency__('Shopify');
    ShopifyUploadProduct.__ResetDependency__('convertProductToListing');
    ShopifyUploadProduct.__ResetDependency__('S3Images');

    sandbox.restore();
  });

  describe('getPhotos', () => {
    let shopifyUploadProduct;

    beforeEach(() => {
      shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
    });

    it('should handle if there are no photo Ids', async () => {
      const product = { };

      const imageIds = await shopifyUploadProduct.getPhotos(logger, product);

      expect(imageIds).to.eql([]);
    });

    it('should get photos ids for existing photos', async () => {
      const product = { photos: [1, 2] };
      models.compositeRequests.getImagesByIds.returns([{ id: 1, channel_image_id: 11 }, { id: 2, channel_image_id: 22 }]);

      const imageIds = await shopifyUploadProduct.getPhotos(logger, product);

      expect(imageIds).to.eql([{ id: 11 }, { id: 22 }]);
      expect(models.compositeRequests.getImagesByIds).to.have.been.calledOnce;
      expect(models.compositeRequests.getImagesByIds).to.have.been.calledWithExactly([1, 2]);
      expect(bucketGetImageUrl).to.not.have.been.called;
    });

    it('should get photos url for non-existing photos', async () => {
      const product = { photos: [1, 2] };
      models.compositeRequests.getImagesByIds.returns([{ id: 1, channel_image_id: 11 }, { id: 2, hash: 'qwertyuiop' }]);
      bucketGetImageUrl.returns('image url');

      const imageIds = await shopifyUploadProduct.getPhotos(logger, product);

      expect(imageIds).to.eql([{ id: 11 }, { src: 'image url' }]);
      expect(models.compositeRequests.getImagesByIds).to.have.been.calledOnce;
      expect(models.compositeRequests.getImagesByIds).to.have.been.calledWithExactly([1, 2]);
      expect(bucketGetImageUrl).to.have.been.calledOnce;
      expect(bucketGetImageUrl).to.have.been.calledWithExactly('qwertyuiop');
    });
  });

  describe('uploadProduct', () => {
    let product;

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

      product = { shop_id: 123, product_id: 234, title: 'test title', changed_properties: ['title'] };

      models.shopifyProducts.getById.returns(product);
      models.shops.getById.returns({ id: 123, name: 'test shop', domain: 'test-name.myshopify.com' });
      convertProductToListing.returns({product_id: 234, title: 'test title'});

      const shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);

      sandbox.stub(shopifyUploadProduct, 'getPhotos');
      shopifyUploadProduct.getPhotos.returns(['test photos']);

      await shopifyUploadProduct.uploadProduct(logger, message);
    });

    it('should get product', async () => {
      expect(models.shopifyProducts.getById).to.have.been.calledOnce;
      expect(models.shopifyProducts.getById).to.have.been.calledWithExactly(12345);
    });

    it('should get shop', async () => {
      expect(models.shops.getById).to.have.been.calledOnce;
      expect(models.shops.getById).to.have.been.calledWithExactly(123);
    });

    it('should convert product to listing', async () => {
      expect(convertProductToListing).to.have.been.calledOnce;
      expect(convertProductToListing).to.have.been.calledWithExactly({ ...product, photos: ['test photos'] }, ['title']);
    });


    it('should enqueue message', async () => {
      expect(getUploadProductMessage).to.have.been.calledOnce;
      expect(getUploadProductMessage).to.have.been.calledWithExactly('test-name.myshopify.com', {product_id: 234, title: 'test title'});

      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-to-api-call', 'prefix.shopify.uploadProduct.APICall', {
        body: {
          request: 'test message'
        },
        headers: { messageId: 'test message id', shopId: 123, total: 42, productId: 12345, type: 'prefix.shopify.uploadProduct.APICall' },
        stack: []
      });
    });
  });

  describe('finishTask', () => {
    beforeEach(async () => {
      const message = {
        headers: {
          messageId: 'test message id',
          shopId: 123,
          total: 42,
          type: 'test.opType'
        },
        body: {},
        stack: [{ test: 'stack' }]
      };

      const shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
      await shopifyUploadProduct.finishTask(logger, message, 'test status', 'test result message');
    });

    it('should update shop counter', async () => {
      expect(models.shops.uploadProductFinished).to.have.been.calledOnce;
      expect(models.shops.uploadProductFinished).to.have.been.calledWithExactly(123);
    });

    it('should enqueue message', async () => {
      expect(rabbit.publish).to.have.been.calledOnce;
      expect(rabbit.publish).to.have.been.calledWithExactly(logger, '${prefix}.shopify-aggregate', '', {
        headers: { messageId: 'test message id', type: '', shopId: 123, total: 42 },
        stack: [{ test: 'stack' }],
        body: {
          message: 'test result message',
          status: 'test status'
        }
      });
    });
  });

  describe('updateImages', () => {
    let shopifyUploadProduct;

    beforeEach(() => {
      shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
    });

    it('should insert new images', async () => {
      const product = { photos: [{ id: 11, src: 'url1' }, { id: 22, src: 'url2' }] };
      const message = { headers: { shopId: 123 } };

      models.images.getByShopId.returns([]);
      models.images.upsert.onCall(0).returns(11);
      models.images.upsert.onCall(1).returns(22);

      const imageIds = await shopifyUploadProduct.updateImages(logger, message, product);

      expect(imageIds).to.eql([11, 22]);
      expect(models.images.upsert).to.have.been.calledTwice;
      expect(models.images.upsert).to.have.been.calledWithExactly({ shop_id: 123, channel_image_id: 11, fullsize_url: 'url1', thumbnail_url: 'url1' });
      expect(models.images.upsert).to.have.been.calledWithExactly({ shop_id: 123, channel_image_id: 22, fullsize_url: 'url2', thumbnail_url: 'url2' });
    });

    it('should update images', async () => {
      const product = { photos: [{ id: 11, src: 'url1' }, { id: 22, src: 'url2' }] };
      const message = { headers: { shopId: 123 } };

      models.images.getByShopId.returns([{ id: 1, channel_image_id: '11' }, { id: 2, channel_image_id: '22' }]);
      models.images.upsert.onCall(0).returns(11);
      models.images.upsert.onCall(1).returns(22);

      const imageIds = await shopifyUploadProduct.updateImages(logger, message, product);

      expect(imageIds).to.eql([11, 22]);
      expect(models.images.upsert).to.have.been.calledTwice;
      expect(models.images.upsert).to.have.been.calledWithExactly({ id: 1, shop_id: 123, channel_image_id: 11, fullsize_url: 'url1', thumbnail_url: 'url1' });
      expect(models.images.upsert).to.have.been.calledWithExactly({ id: 2, shop_id: 123, channel_image_id: 22, fullsize_url: 'url2', thumbnail_url: 'url2' });
    });
  });

  describe('processAPICallResponse', () => {
    it('should update product in DB', async () => {
      const message = {
        headers: { shopId: 123 },
        body: { response: { status: 200, data: { product: { title: 'test listing data' } } } }
      };

      const shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
      sandbox.stub(shopifyUploadProduct, 'finishTask');
      sandbox.stub(shopifyUploadProduct, 'updateProductInDB');
      sandbox.stub(shopifyUploadProduct, 'isUploadedProductValid');
      shopifyUploadProduct.updateProductInDB.returns(Promise.resolve());
      shopifyUploadProduct.isUploadedProductValid.returns(true);

      await shopifyUploadProduct.processAPICallResponse(logger, message);

      expect(shopifyUploadProduct.updateProductInDB).to.have.been.calledOnce;
      expect(shopifyUploadProduct.updateProductInDB).to.have.been.calledWithExactly(logger, message);
    });

    it('should finish task', async () => {
      const message = {
        headers: { shopId: 123 },
        body: { response: { status: 200, data: { product: { title: 'test listing data' } } } }
      };
      const shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
      sandbox.stub(shopifyUploadProduct, 'finishTask');
      sandbox.stub(shopifyUploadProduct, 'updateProductInDB');
      sandbox.stub(shopifyUploadProduct, 'isUploadedProductValid');
      shopifyUploadProduct.updateProductInDB(Promise.resolve());
      shopifyUploadProduct.isUploadedProductValid.returns(true);

      await shopifyUploadProduct.processAPICallResponse(logger, message);

      expect(shopifyUploadProduct.finishTask).to.have.been.calledOnce;
      expect(shopifyUploadProduct.finishTask).to.have.been.calledWithExactly(logger, message, 'success');
    });

    it('should fail task', async () => {
      const message = {
        headers: { shopId: 123 },
        body: { response: { status: 500, data: 'test error' } }
      };

      const shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
      sandbox.stub(shopifyUploadProduct, 'retryTaskOrFail');
      sandbox.stub(shopifyUploadProduct, 'updateProductInDB');
      sandbox.stub(shopifyUploadProduct, 'isUploadedProductValid');
      shopifyUploadProduct.updateProductInDB(Promise.resolve());
      shopifyUploadProduct.isUploadedProductValid.returns(true);

      await shopifyUploadProduct.processAPICallResponse(logger, message);

      expect(shopifyUploadProduct.retryTaskOrFail).to.have.been.calledOnce;
      expect(shopifyUploadProduct.retryTaskOrFail).to.have.been.calledWithExactly(logger, message);
    });

    it.skip('should fail task if data from shopify are different from the ones we have', async () => {
      const message = {
        headers: { shopId: 123 },
        body: { response: { status: 200, data: { product: { title: 'test listing data' } } } }
      };

      const shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);
      sandbox.stub(shopifyUploadProduct, 'retryTaskOrFail');
      sandbox.stub(shopifyUploadProduct, 'updateProductInDB');
      sandbox.stub(shopifyUploadProduct, 'isUploadedProductValid');
      shopifyUploadProduct.updateProductInDB(Promise.resolve());
      shopifyUploadProduct.isUploadedProductValid.returns(false);

      await shopifyUploadProduct.processAPICallResponse(logger, message);

      expect(shopifyUploadProduct.retryTaskOrFail).to.have.been.calledOnce;
      expect(shopifyUploadProduct.retryTaskOrFail).to.have.been.calledWithExactly(logger, {
        headers: { shopId: 123 },
        body: { response: { status: 200, data: 'Response does not match request for upload product' } }
      });
    });
  });

  describe('isUploadedProductValid', () => {
    let shopifyUploadProduct;
    let convertListingToProduct;
    let isResponseValid;
    let productReq;
    let productRes;

    beforeEach(async () => {
      productReq = { id: '1234', title: 'test product req' };
      productRes = { id: '1234', title: 'test product res', images: [], something: 'else' };

      convertListingToProduct = sinon.stub()
        .onCall(0).returns(productReq)
        .onCall(1).returns(productRes);
      isResponseValid = sinon.stub().returns(true);


      ShopifyUploadProduct.__Rewire__('convertListingToProduct', convertListingToProduct);
      ShopifyUploadProduct.__Rewire__('isResponseValid', isResponseValid);

      shopifyUploadProduct = new ShopifyUploadProduct(config, models, rabbit);

      const message = { body: {
        request: { payload: { product: productReq } },
        response: { data: { product: productRes } } }
      };

      await shopifyUploadProduct.isUploadedProductValid(logger, message);
    });

    afterEach(() => {
      ShopifyUploadProduct.__ResetDependency__('convertListingToProduct');
      ShopifyUploadProduct.__ResetDependency__('isResponseValid');
    });

    it('should convert request to product', async () => {
      expect(convertListingToProduct).to.have.been.calledWithExactly(productReq);
    });

    it('should convert result to product', async () => {
      expect(convertListingToProduct).to.have.been.calledWithExactly(productRes);
    });

    it('should compare only requested properties', async () => {
      expect(isResponseValid).to.have.been.calledWithExactly({ id: '1234', title: 'test product req' }, { id: '1234', title: 'test product res' });
    });
  });

  describe('process', () => {
    let shopifyAPICall;

    beforeEach(() => {
      shopifyAPICall = new ShopifyUploadProduct(config, null, rabbit);
      sandbox.stub(shopifyAPICall, 'processAPICallResponse');
      sandbox.stub(shopifyAPICall, 'uploadProduct');
      sandbox.stub(shopifyAPICall, 'retryTaskOrFail');
    });

    it('should process API call response', async () => {
      const message = { headers: { type: 'prefix.shopify.uploadProduct.APICall' } };
      await shopifyAPICall.process(logger, message);

      expect(shopifyAPICall.processAPICallResponse).to.have.been.calledOnce;
      expect(shopifyAPICall.processAPICallResponse.args[0][1]).to.eql(message);
    });

    it('should download product', async () => {
      const message = { headers: { type: 'prefix.shopify.uploadProduct' } };
      await shopifyAPICall.process(logger, message);

      expect(shopifyAPICall.uploadProduct).to.have.been.calledOnce;
      expect(shopifyAPICall.uploadProduct.args[0][1]).to.eql(message);
    });


    it('should handle error message', async () => {
      const message = { headers: { type: 'prefix.shopify.uploadProduct.error' } };
      await shopifyAPICall.process(logger, message);

      expect(shopifyAPICall.retryTaskOrFail).to.have.been.calledOnce;
      expect(shopifyAPICall.retryTaskOrFail.args[0][1]).to.eql(message);
    });
  });

  describe('retryTaskOrFail', () => {
    let shopifyAPICall;

    beforeEach(() => {
      shopifyAPICall = new ShopifyUploadProduct(config, null, rabbit);
      sandbox.stub(shopifyAPICall, 'finishTask');
      sandbox.stub(shopifyAPICall, 'uploadProduct');
    });

    it('should retry upload task', async () => {
      const message = { headers: { type: 'prefix.shopify.uploadProduct.APICall' }, body: { response: { data: 'test error' } } };
      await shopifyAPICall.retryTaskOrFail(logger, message);

      expect(shopifyAPICall.uploadProduct).to.have.been.calledOnce;
      expect(shopifyAPICall.uploadProduct).to.have.been.calledWithExactly(logger, { headers: { type: 'prefix.shopify.uploadProduct.APICall', retries: 1 }, body: { response: { data: 'test error' } } });
    });

    it('should finish task', async () => {
      const message = { headers: { type: 'prefix.shopify.uploadProduct.APICall', retries: 2 }, body: { response: { data: 'test error' } } };
      await shopifyAPICall.retryTaskOrFail(logger, message);

      expect(shopifyAPICall.finishTask).to.have.been.calledOnce;
      expect(shopifyAPICall.finishTask).to.have.been.calledWithExactly(logger, message, 'error', 'test error');
    });
  });
});
