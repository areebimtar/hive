import _ from 'lodash';
import Promise from 'bluebird';
import moment from 'moment';
import * as messageUtils from '../messageUtils';
import Shopify from 'global/modules/shopify';
import { convertProductToListing, convertListingToProduct } from 'global/modules/shopify/convertProduct';
import S3Images from 'global/modules/aws';
import { assert } from 'global/assert';

import { FIELDS } from 'global/modules/shopify/constants';
import { MESSAGE_TYPE, EXCHANGES, STATUS } from '../constants';

import { isResponseValid } from './shopifyUploadProductComparators';

export default class ShopifyUploadProduct {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async getPhotos(logger, product) {
    const bucketName = _.get(this.config, 'AWS.images.bucketName');
    const awsConfig = _.get(this.config, 'AWS.images');
    const bucket = new S3Images(bucketName, awsConfig, logger);

    const photoIds = product[FIELDS.PHOTOS];
    if (_.isEmpty(photoIds)) { return []; }

    const photos = await this.models.compositeRequests.getImagesByIds(photoIds);
    const photosMap = _.reduce(photos, (result, photo) => _.set(result, photo.id, photo), {});
    const sortedPhotos = _.map(photoIds, photoId => photosMap[photoId]);

    return _.map(sortedPhotos, photo => {
      if (photo.channel_image_id) {
        return { id: photo.channel_image_id };
      }
      return { src: bucket.getImageUrl(photo.hash) };
    });
  }

  async uploadProduct(logger, message) {
    const { messageId, total, retries } = messageUtils.getHeaders(message);
    const productId = messageUtils.getHeaderField(message, 'productId');

    const shopify = new Shopify(this.config);
    const product = await this.models.shopifyProducts.getById(productId);
    const shop = await this.models.shops.getById(product[FIELDS.SHOP_ID]);
    assert(shop, `There is no shop with ${product[FIELDS.SHOP_ID]} ID`);

    // prepare photos
    product[FIELDS.PHOTOS] = await this.getPhotos(logger, product);

    const listing = convertProductToListing(product, product[FIELDS.CHANGED_PROPERTIES]);

    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.UPLOAD_PRODUCT.API_CALL);
    let msg = {
      headers: {
        type: type,
        messageId: messageId,
        shopId: product[FIELDS.SHOP_ID],
        total: total,
        productId: productId
      },
      stack: messageUtils.getStack(message),
      body: {
        request: shopify.getUploadProductMessage(shop.domain, listing)
      }
    };

    if (retries) {
      msg = messageUtils.setHeaderField(msg, 'retries', retries);
    }

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_TO_API_CALL, type, msg);
  }

  retryTaskOrFail(logger, message) {
    const error = messageUtils.getBodyField(message, ['response', 'data']);
    logger.error('Uploading product failed', error);

    const retries = messageUtils.getHeaderField(message, 'retries', 0);
    if (retries < this.config.retries) {
      logger.error(`Retry upload product. retries: ${retries + 1}`);
      return this.uploadProduct(logger, messageUtils.setHeaderField(message, 'retries', retries + 1));
    }

    return this.finishTask(logger, message, STATUS.ERROR, error);
  }

  async finishTask(logger, message, status, statusMessage) {
    const total = messageUtils.getHeaderField(message, 'total');
    const shopId = messageUtils.getHeaderField(message, 'shopId');

    await this.models.shops.uploadProductFinished(shopId);

    if (!total) { return; }

    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.AGGREGATOR);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getHeaderField(message, 'messageId'),
        shopId: shopId,
        total: total
      },
      stack: messageUtils.getStack(message),
      body: {
        status: status,
        message: statusMessage
      }
    };

    await this.rabbit.publish(logger, EXCHANGES.SHOPIFY_AGGREGATE, type, msg);
  }

  async updateImages(logger, message, product) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    const velaImages = await this.models.images.getByShopId(shopId);
    const shopifyImages = product.photos;

    return Promise.map(shopifyImages, async shopifyImage => {
      const velaImage = _.find(velaImages, { channel_image_id: String(shopifyImage.id) });
      const velaImageId = _.get(velaImage, 'id');

      const imageData = {
        shop_id: shopId,
        channel_image_id: _.get(shopifyImage, 'id', null),
        fullsize_url: _.get(shopifyImage, 'src', ''),
        thumbnail_url: _.get(shopifyImage, 'src', '')
      };

      if (velaImageId) {
        imageData.id = velaImageId;
      }

      return this.models.images.upsert(imageData);
    });
  }

  async isUploadedProductValid(logger, message) {
    const body = messageUtils.getBody(message);
    const requestProduct = convertListingToProduct(_.get(body, ['request', 'payload', 'product']));
    const responseProduct = convertListingToProduct(_.get(body, ['response', 'data', 'product']));

    const requestProperties = _.keys(requestProduct);
    return isResponseValid(requestProduct, _.pick(responseProduct, requestProperties));
  }

  async updateProductInDB(logger, message) {
    const body = messageUtils.getBody(message);
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    const listing = _.get(body, ['response', 'data', 'product']);
    const product = convertListingToProduct(listing);

    const photoIds = await this.updateImages(logger, message, product);
    product[FIELDS.PHOTOS] = photoIds;
    product[FIELDS.SHOP_ID] = shopId;
    product[FIELDS.IS_INVALID] = false;
    product[FIELDS.INVALID_REASON] = null;
    product[FIELDS.MODIFIED_BY_HIVE] = false;
    product[FIELDS.CHANGED_PROPERTIES] = [];
    product[FIELDS.LAST_SYNC] = moment().toISOString();

    await this.models.shopifyProducts.upsert(product);
  }

  async markProductAsInvalid(logger, message) {
    const body = messageUtils.getBody(message);
    const productId = messageUtils.getHeaderField(message, 'productId');
    const error = _.get(body, ['response', 'data']);

    const product = {
      [FIELDS.ID]: productId,
      [FIELDS.IS_INVALID]: true,
      [FIELDS.INVALID_REASON]: _.isObject(error) ? JSON.stringify(error) : error,
      [FIELDS.MODIFIED_BY_HIVE]: false,
      [FIELDS.CHANGED_PROPERTIES]: [],
      [FIELDS.LAST_SYNC]: moment().toISOString()
    };

    await this.models.shopifyProducts.update(product);
  }

  async processAPICallResponse(logger, message) {
    const body = messageUtils.getBody(message);

    const status = _.get(body, ['response', 'status']);
    if (status === STATUS.ERROR || status < 200 || status >= 300) {
      return this.retryTaskOrFail(logger, message);
    }

    // FIXME: disabled for now (figure out why shopify sends back different data in response)
    const successfullyUploaded = await this.isUploadedProductValid(logger, message);
    if (false && !successfullyUploaded) {
      return this.retryTaskOrFail(logger, messageUtils.setBodyField(message, ['response', 'data'], 'Response does not match request for upload product'));
    }

    await this.updateProductInDB(logger, message);
    return this.finishTask(logger, message, STATUS.SUCCESS);
  }

  async process(logger, message) {
    const headers = messageUtils.getHeaders(message);

    const type = messageUtils.stripPrefix(headers.type);
    switch (type) {
      case MESSAGE_TYPE.SHOPIFY.UPLOAD_PRODUCT.API_CALL:
        await this.processAPICallResponse(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.UPLOAD_PRODUCT.API_CALL_ERROR:
      case MESSAGE_TYPE.SHOPIFY.UPLOAD_PRODUCT.ERROR:
        await this.retryTaskOrFail(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.UPLOAD_PRODUCT.COMMAND:
        await this.uploadProduct(logger, message);
        break;
      default:
        logger.unknownMessageType(type);
    }
  }
}
