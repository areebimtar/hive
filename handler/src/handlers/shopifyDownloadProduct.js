import _ from 'lodash';
import Promise from 'bluebird';
import * as messageUtils from '../messageUtils';
import Shopify from 'global/modules/shopify';
import { convertListingToProduct } from 'global/modules/shopify/convertProduct';
import { assert } from 'global/assert';

import { FIELDS } from 'global/modules/shopify/constants';
import { MESSAGE_TYPE, EXCHANGES, STATUS } from '../constants';

export default class ShopifyDownloadProduct {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async downloadProduct(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const { productId } = headers;

    const shopify = new Shopify(this.config);
    const product = await this.models.shopifyProducts.getById(productId);
    const shop = await this.models.shops.getById(product[FIELDS.SHOP_ID]);

    assert(shop, `There is no shop with ${product[FIELDS.SHOP_ID]} ID`);

    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.DOWNLOAD_PRODUCT.API_CALL);
    let msg = {
      headers: {
        type: type,
        messageId: headers.messageId,
        shopId: product[FIELDS.SHOP_ID],
        total: headers.total
      },
      stack: messageUtils.getStack(message),
      body: {
        request: shopify.getDownloadProductMessage(shop.domain, product[FIELDS.PRODUCT_ID])
      }
    };

    if (headers.retries) {
      msg = messageUtils.setHeaderField(msg, 'retries', headers.retries);
    }

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_TO_API_CALL, type, msg);
  }

  retryTaskOrFail(logger, message) {
    const error = messageUtils.getBodyField(message, ['response', 'data']);
    logger.error('Downloading product failed', error);

    const retries = messageUtils.getHeaderField(message, 'retries', 0);
    if (retries < this.config.retries) {
      logger.error(`Retry download product. retries: ${retries + 1}`);
      return this.downloadProduct(logger, messageUtils.setHeaderField(message, 'retries', retries + 1));
    }

    return this.finishTask(logger, message, STATUS.ERROR, error);
  }

  async finishTask(logger, message, status, statusMessage) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');

    await this.models.shops.downloadProductFinished(shopId);

    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.AGGREGATOR);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getHeaderField(message, 'messageId'),
        shopId: shopId,
        total: messageUtils.getHeaderField(message, 'total')
      },
      stack: messageUtils.getStack(message),
      body: {
        status: status,
        message: statusMessage
      }
    };

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_AGGREGATE, type, msg);
  }

  async updateImages(logger, message, product) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    const velaImages = await this.models.images.getByShopId(shopId);
    const shopifyImages = product.photos;

    return Promise.map(shopifyImages, async image => {
      const existingImage = _.find(velaImages, { channel_image_id: String(image.id) });
      if (existingImage) { return existingImage.id; }

      return this.models.images.upsert({
        shop_id: shopId,
        channel_image_id: image.id,
        fullsize_url: image.src,
        thumbnail_url: image.src
      });
    });
  }

  async processAPICallResponse(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const body = messageUtils.getBody(message);

    const status = _.get(body, ['response', 'status']);
    if (status === STATUS.ERROR || status < 200 || status >= 300) {
      await this.retryTaskOrFail(logger, message);
      return;
    }

    // get listing/product
    const listing = _.get(body, ['response', 'data', 'product']);
    const product = convertListingToProduct(listing);

    // get image ids
    const imageIds = await this.updateImages(logger, message, product);
    product[FIELDS.PHOTOS] = imageIds;

    // store/update product in DB
    product[FIELDS.SHOP_ID] = headers.shopId;
    await this.models.shopifyProducts.upsert(product);
    logger.debug('Product stored/updated in DB');

    await this.finishTask(logger, message, STATUS.SUCCESS);
  }

  async process(logger, message) {
    const headers = messageUtils.getHeaders(message);

    const type = messageUtils.stripPrefix(headers.type);
    switch (type) {
      case MESSAGE_TYPE.SHOPIFY.DOWNLOAD_PRODUCT.API_CALL:
        await this.processAPICallResponse(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.DOWNLOAD_PRODUCT.API_CALL_ERROR:
      case MESSAGE_TYPE.SHOPIFY.DOWNLOAD_PRODUCT.ERROR:
        await this.retryTaskOrFail(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.DOWNLOAD_PRODUCT.COMMAND:
        await this.downloadProduct(logger, message);
        break;
      default:
        logger.unknownMessageType(type);
    }
  }
}
