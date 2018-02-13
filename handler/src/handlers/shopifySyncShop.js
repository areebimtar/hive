import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';
import { assert } from 'global/assert';
import Shopify from 'global/modules/shopify';
import { FIELDS } from 'global/modules/shopify/constants';
import { CHANNEL } from 'global/constants';
import { SHOP_SYNC_STATUS_SYNC, SHOP_SYNC_STATUS_INITIAL_SYNC } from 'global/db/models/constants';
import { MESSAGE_TYPE, EXCHANGES, STATUS } from '../constants';
import * as messageUtils from '../messageUtils';
import { convertListingToProduct } from 'global/modules/shopify/convertProduct';

const RESYNC_SHOP_PERIOD = 6 * 60 * 60 * 1000; // 6 hours in miliseconds

export default class ShopifySyncShop {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  markShopInSync(message, shopId) {
    const body = messageUtils.getBody(message);
    return this.models.shops.syncStarted(shopId, !body.triggeredByUser);
  }

  markShopSyncDone(shopId, incomplete = false, error = null) {
    return this.models.shops.syncFinished(shopId, incomplete, error);
  }

  canStartSyncShop(logger, message, shop) {
    const body = messageUtils.getBody(message);

    if (body.triggeredByUser || body.triggeredByApplyOperations) {
      return true;
    }

    if (shop.invalid) {
      logger.debug('Skipping invalid shop, nothing to do');
      return false;
    }

    if (shop.sync_status === SHOP_SYNC_STATUS_SYNC || shop.status === SHOP_SYNC_STATUS_INITIAL_SYNC) {
      logger.debug('Sync is already in progress, nothing to do');
      return false;
    }

    if (moment(shop.last_sync_timestamp).isAfter(moment().subtract(RESYNC_SHOP_PERIOD, 'ms'))) {
      logger.debug(`It is not yet time ${moment(shop.last_sync_timestamp).toISOString()} to do a sync and/or shop sync is not triggered by user`);
      return false;
    }

    logger.debug('Shop will be synchronized');
    return true;
  }

  async getProductsCount(logger, message, shop) {
    const shopify = new Shopify(this.config);

    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.COUNT);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: shop.id
      },
      stack: messageUtils.getChildStack(message),
      body: {
        request: shopify.getProductsCountMessage(shop.domain)
      }
    };

    await this.rabbit.publish(logger, EXCHANGES.SHOPIFY_TO_API_CALL, type, msg);
  }

  async getShopInfo(logger, message, shop) {
    const shopify = new Shopify(this.config);

    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.SHOP_INFO);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: shop.id
      },
      stack: messageUtils.getChildStack(message),
      body: {
        request: shopify.getShopInfoMessage(shop.domain)
      }
    };

    await this.rabbit.publish(logger, EXCHANGES.SHOPIFY_TO_API_CALL, type, msg);
  }

  async getProducts(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const shop = await this.getShop(logger, headers.shopId);

    const body = messageUtils.getBody(message);
    const count = _.get(body, ['response', 'data', 'count']);
    if (!count) {
      logger.debug('Shop does not have products. Nothing to do');
      await this.markShopSyncDone(shop.id);
      return;
    }

    const shopify = new Shopify(this.config);
    const bodies = shopify.getGetProductsMessages(shop.domain, count, [FIELDS.ID, FIELDS.UPDATED_AT]);
    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.GET_PRODUCTS);

    await Promise.map(bodies, messageBody => {
      const messageHeaders = {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: shop.id,
        total: messageBody.count,
        batches: bodies.length
      };

      const msg = {
        headers: messageHeaders,
        stack: messageUtils.getStackWithHeaders(message, messageHeaders),
        body: {
          request: messageBody
        }
      };

      return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_TO_API_CALL, type, msg);
    });
  }

  getLeftDifference(left, right) {
    const rightIdMap = _.reduce(right, (result, product) => _.set(result, product[FIELDS.PRODUCT_ID], product), {});
    return _.filter(left, shopifyProduct => !rightIdMap[shopifyProduct[FIELDS.PRODUCT_ID]]);
  }

  getProductsToUpload(velaProducts) {
    return _.filter(velaProducts, product => !product[FIELDS.IS_INVALID] && product[FIELDS.MODIFIED_BY_HIVE]);
  }

  getProductsToDownload(shopifyProducts, velaProducts) {
    const velaProductsIdMap = _.reduce(velaProducts, (result, velaProduct) => _.set(result, velaProduct[FIELDS.PRODUCT_ID], velaProduct), {});
    const toDownload = _.filter(shopifyProducts, shopifyProduct => _.get(velaProductsIdMap, [shopifyProduct[FIELDS.PRODUCT_ID], FIELDS.UPDATED_AT]) !== shopifyProduct[FIELDS.UPDATED_AT]);
    const products = _.map(toDownload, shopifyProduct => velaProductsIdMap[shopifyProduct[FIELDS.PRODUCT_ID]]);
    return _.compact(products);
  }

  async createNewProducts(shopId, newProducts) {
    const products = _.map(newProducts, product => _.set(product, FIELDS.SHOP_ID, shopId));

    const ids = await this.models.shopifyProducts.upsertProducts(products);
    return _.map(products, (product, index) => _.set(product, FIELDS.ID, ids[index]));
  }

  async enqueueOperation(logger, message, routingKey, total, productId) {
    const type = this.rabbit.getPrefixedName(routingKey);
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: messageUtils.getHeaderField(message, 'shopId'),
        total: total,
        productId: productId
      },
      stack: messageUtils.getStack(message),
      body: {}
    };

    await this.rabbit.publish(logger, EXCHANGES.CHANNEL_ROUTER, type, msg);
  }

  async finishProductsBatch(logger, message, total, status, errorMessage) {
    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.AGGREGATOR);
    const messageId = messageUtils.getNewMessageId();
    const msg = {
      headers: {
        type: type,
        messageId: messageId,
        shopId: messageUtils.getHeaderField(message, 'shopId'),
        total: total
      },
      stack: messageUtils.getStack(message),
      body: {
        status: status,
        message: errorMessage
      }
    };

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_AGGREGATE, type, msg);
  }

  async scheduleChildTasks(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const shop = await this.getShop(logger, headers.shopId);

    const messageBody = messageUtils.getBody(message);
    // get shopify products
    const products = _.get(messageBody, ['response', 'data', 'products'], []);
    const shopifyProducts = _.map(products, convertListingToProduct);
    const shopifyProductIds = _.map(shopifyProducts, product => String(product[FIELDS.PRODUCT_ID]));

    // store products from this chunk to sync shop table
    await this.models.syncShops.addProducts(shop.id, shopifyProductIds);

    // get vela products
    const velaProducts = await this.models.shopifyProducts.getStatusSummariesByShopifyProductIds(shopifyProductIds);

    // get which products are new
    const newProducts = this.getLeftDifference(shopifyProducts, velaProducts);
    const toDownloadProductsNew = await this.createNewProducts(shop.id, newProducts);
    // get which products needs to be uploaded and which downloaded
    const toUploadProducts = this.getProductsToUpload(velaProducts);
    const toDownloadProducts = this.getProductsToDownload(this.getLeftDifference(shopifyProducts, toUploadProducts), velaProducts);

    const toDownloadProductsAll = toDownloadProductsNew.concat(toDownloadProducts);
    // update sync shop counters
    await this.models.shops.updateSyncCounters(shop.id, toUploadProducts.length, toDownloadProductsAll.length);

    // get total # of tasks
    const currentBatchTotal = toUploadProducts.length + toDownloadProductsAll.length;
    if (currentBatchTotal) {
      logger.debug(`Creating ${currentBatchTotal} child tasks`);
    }
    const total = toUploadProducts.length + toDownloadProductsAll.length;
    if (!total) {
      await this.finishProductsBatch(logger, message, 1, STATUS.SUCCESS, null);
      // we are done with this batch
      return;
    }

    // schedule products for upload
    let promises = [];
    if (!_.isEmpty(toUploadProducts)) {
      const toUploadProductsPromises = Promise.map(toUploadProducts, product =>
        this.enqueueOperation(logger, message, MESSAGE_TYPE.SHOPIFY.UPLOAD_PRODUCT.COMMAND, total, product[FIELDS.ID]));
      promises = promises.concat(toUploadProductsPromises);
    }

    // schedule products for download
    if (!_.isEmpty(toDownloadProductsAll)) {
      const toDownloadProductsAllPromises = Promise.map(toDownloadProductsAll, product =>
        this.enqueueOperation(logger, message, MESSAGE_TYPE.SHOPIFY.DOWNLOAD_PRODUCT.COMMAND, total, product[FIELDS.ID]));
      promises = promises.concat(toDownloadProductsAllPromises);
    }

    await Promise.all(promises);
  }

  async deleteProducts(shopId) {
    const velaProducts = await this.models.shopifyProducts.getByShopId(shopId, [FIELDS.ID, FIELDS.PRODUCT_ID]);
    const syncShopProducts = await this.models.syncShops.getByShopId(shopId);

    const toDeleteProducts = _.filter(velaProducts, velaProduct => !_.find(syncShopProducts, { product_id: velaProduct[FIELDS.PRODUCT_ID] }));
    if (!_.isEmpty(toDeleteProducts)) {
      const ids = _.map(toDeleteProducts, 'id');
      await this.models.shopifyProducts.deleteByIds(ids);
    }
  }

  getCombinedErrorMessage(message) {
    const body = messageUtils.getBody(message);
    const results = _.get(body, 'results', []);
    const isIncomplete = _.reduce(results, (incomplete, result) => incomplete || _.get(result, 'status') !== STATUS.SUCCESS, false);
    const errors = _.reduce(results, (errorMessages, result) => {
      if (result.status === STATUS.ERROR) {
        return errorMessages.concat(`${result.messageId}:${result.message}`);
      }
      return errorMessages;
    }, []);
    return isIncomplete ? errors.join('; ') : null;
  }

  async finishSyncShop(message, shopId) {
    const errorMessage = this.getCombinedErrorMessage(message);
    await this.markShopSyncDone(shopId, !!errorMessage, errorMessage);
  }

  async getShop(logger, shopId) {
    assert(shopId, 'Shop ID must be provided');

    const shop = await this.models.shops.getById(shopId);
    assert(shop, `There is no shop with ${shopId} ID`);
    logger.debug('got shop', shop);
    assert(shop.channel_id === String(CHANNEL.SHOPIFY), `Wrong channel id ${shop.channel_id}`);

    return shop;
  }

  async processCompletedProductsBatch(logger, message) {
    const batches = messageUtils.getHeaderField(message, 'batches');
    const errorMessage = this.getCombinedErrorMessage(message);
    const status = !!errorMessage ? STATUS.ERROR : STATUS.SUCCESS;
    await this.finishProductsBatch(logger, message, batches, status, errorMessage);
  }

  async subtasksCompleted(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const shop = await this.getShop(logger, headers.shopId);

    await this.deleteProducts(shop.id);
    await this.models.syncShops.deleteByShopId(shop.id);
    await this.finishSyncShop(message, shop.id);
  }

  async processSyncShop(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const shop = await this.getShop(logger, headers.shopId);

    const doSync = this.canStartSyncShop(logger, message, shop);
    if (!doSync) { return; }

    try {
      await this.markShopInSync(message, shop.id);
    } catch (error) {
      logger.debug(error);
    }

    // remove all old aggregates and sync shop products
    await this.models.syncShops.deleteByShopId(shop.id);
    await this.models.aggregates.deleteByParentMessageId(headers.messageId);

    await this.getProductsCount(logger, message, shop);
    await this.getShopInfo(logger, message, shop);
  }

  async updateShop(logger, message) {
    const headers = messageUtils.getHeaders(message);
    const velaShop = await this.getShop(logger, headers.shopId);

    const body = messageUtils.getBody(message);
    const responseData = _.get(body, ['response', 'data']);
    const status = _.get(responseData, 'status');
    const shopifyShop = _.get(responseData, 'shop');

    if (status < 200 || status >= 400) {
      // we get bad response from Shopify, log response and do nothing
      logger.error(`Couldn't retrieve shop info: ${_.get(responseData, ['response', 'text'])}`);
      return;
    }

    if (shopifyShop.name !== velaShop.name) {
      await this.models.shops.updateShopName(headers.shopId, shopifyShop.name);
    }

    if (shopifyShop.myshopify_domain !== velaShop.domain) {
      await this.models.shops.updateShopDomain(headers.shopId, shopifyShop.myshopify_domain);
    }
  }

  async processError(logger, message) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    const error = messageUtils.getBodyField(message, 'error');
    await this.markShopSyncDone(shopId, true, error);
  }

  async process(logger, message) {
    const headers = messageUtils.getHeaders(message);

    const type = messageUtils.stripPrefix(headers.type);
    switch (type) {
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.SHOP_INFO:
        await this.updateShop(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.COUNT:
        await this.getProducts(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.GET_PRODUCTS:
        await this.scheduleChildTasks(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.GET_PRODUCTS_COMPLETED:
        await this.processCompletedProductsBatch(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.SUBTASKS_COMPLETED:
        await this.subtasksCompleted(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.ERROR:
        await this.processError(logger, message);
        break;
      case MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.COMMAND:
        await this.processSyncShop(logger, message);
        break;
      default:
        logger.unknownMessageType(type);
    }
  }
}
