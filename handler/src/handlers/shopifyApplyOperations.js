import _ from 'lodash';
import moment from 'moment';
import { fromJS } from 'immutable';
import { EXCHANGES } from '../constants';
import * as messageUtils from '../messageUtils';

import { getHandlersByChannelId } from 'global/modules/operationHandlers';
import { CHANNEL } from 'global/constants';
import { assert } from 'global/assert';
import { FIELDS } from 'global/modules/shopify/constants';
import { MESSAGE_TYPE, STATUS } from '../constants';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/shopify/bulkOpsConstants';

export default class ShopifyApplyOperations {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  getOpType(type) {
    return String(type).split('.').shift();
  }

  getProductFields(operations) {
    const fields = _.uniq(_.reduce(operations, (types, operation) => types.concat(this.getOpType(operation.type)), []));
    return fields.concat([FIELDS.ID, FIELDS.SHOP_ID, FIELDS.PRODUCT_ID]);
  }

  async upsertVelaImage(hash, mime) {
    return this.models.velaImages.upsert({ hash, mime });
  }

  async upsertImage(shopId, velaImageId) {
    return this.models.db.tx(async transaction => {
      const images = await this.models.images.getByVelaImageId(shopId, velaImageId, transaction);
      if (images.length) {
        return images[0].id;
      }
      return this.models.images.upsert({ vela_image_id: velaImageId, shop_id: shopId }, transaction);
    });
  }

  async addNewImages(shopId, images, hashToImageIdMap) {
    for (let i = 0; i < images.length; ++ i) {
      const image = images[i];
      if (!hashToImageIdMap[image.hash]) {
        const velaImageId = await this.upsertVelaImage(image.hash, image.mime);
        const imageId = await this.upsertImage(shopId, velaImageId);
        hashToImageIdMap[image.hash] = imageId;
      }
    }

    return hashToImageIdMap;
  }

  updatePhotoOpValue(value, hashToImageIdMap) {
    return _.map(value, photo =>
      _.get(hashToImageIdMap, _.get(photo, 'hash'), photo));
  }

  async storeImages(shopId, operations) {
    let hashToImageIdMap = {};

    for (let i = 0; i < operations.length; ++i) {
      const op = operations[i];

      switch (op.type) {
        case BULK_EDIT_OP_CONSTS.PHOTOS_ADD:
          hashToImageIdMap = await this.addNewImages(shopId, op.value, hashToImageIdMap);
          op.value = this.updatePhotoOpValue(op.value, hashToImageIdMap);
          break;
        case BULK_EDIT_OP_CONSTS.PHOTOS_REPLACE:
          const newPhotos = _.reject(op.value, photo => !photo);
          hashToImageIdMap = await this.addNewImages(shopId, newPhotos, hashToImageIdMap);
          op.value = this.updatePhotoOpValue(op.value, hashToImageIdMap);
          break;
        default:
      }
    }
    return operations;
  }

  doApplyOperations(product, operations) {
    const bulkEditOps = getHandlersByChannelId(CHANNEL.SHOPIFY);

    // apply each op
    return _.reduce(operations, (updatedProduct, op) => {
      const type = this.getOpType(op.type);
      if (op.products.indexOf(product.id) === -1) { return updatedProduct; }

      const bulkEditOp = bulkEditOps[type];
      assert(bulkEditOp, `Missing operation handler for type ${type}`);

      const productWithNewChanges = bulkEditOp.apply(updatedProduct, op.type, fromJS(op.value), true);
      // but store it only if it is valid
      const status = bulkEditOp.validate(productWithNewChanges);

      if (status && status.get('valid')) {
        return productWithNewChanges;
      }

      return updatedProduct;
    }, fromJS(product)).toJS();
  }

  getChangedProperties(product, updatedProduct) {
    const productKeys = _.keys(product);
    const updatedProductKeys = _.keys(updatedProduct);
    const allKeys = _.uniq(productKeys.concat(updatedProductKeys));

    return _.reduce(allKeys, (changedProperties, key) => {
      if (!_.isEqual(product[key], updatedProduct[key])) {
        changedProperties.push(key);
      }
      return changedProperties;
    }, []);
  }

  incrementApplyCounter(logger, message) {
    const shopId = messageUtils.getHeaderField(message, 'shopId');
    return this.models.shops.incrementApplyProgress(shopId, 1);
  }

  async finishTask(logger, message, status, statusMessage) {
    const { messageId, shopId, total } = messageUtils.getHeaders(message);
    const type = this.rabbit.getPrefixedName(MESSAGE_TYPE.AGGREGATOR);
    const msg = {
      headers: {
        type: type,
        messageId: messageId,
        shopId: shopId,
        total: total
      },
      stack: messageUtils.getStack(message),
      body: {
        status: status,
        message: statusMessage
      }
    };

    return this.rabbit.publish(logger, EXCHANGES.SHOPIFY_AGGREGATE, type, msg);
  }

  async process(logger, message) {
    try {
      const body = messageUtils.getBody(message);
      const { productId, operations } = body;
      const shopId = messageUtils.getHeaderField(message, 'shopId');

      assert(productId, `Missing product ID: ${productId}`);
      assert(_.isArray(operations) && operations.length, `Missing operation: ${operations}`);

      const fields = this.getProductFields(operations);
      const product = await this.models.shopifyProducts.getById(productId, fields);
      assert(product, `Invalid product: ${product}`);

      const updatedOperations = await this.storeImages(shopId, operations);
      const updatedProduct = this.doApplyOperations(product, updatedOperations);
      const changedProperties = this.getChangedProperties(product, updatedProduct);

      if (changedProperties.length) {
        logger.debug(`Changed properites for product ID ${productId}: ${changedProperties}`);
        updatedProduct[FIELDS.MODIFIED_BY_HIVE] = true;
        updatedProduct[FIELDS.CHANGED_PROPERTIES] = changedProperties;
        updatedProduct[FIELDS.HIVE_UPDATED_AT] = moment().toISOString();
        await this.models.shopifyProducts.upsert(updatedProduct);
      } else {
        logger.debug(`There are no changes for product ID ${productId}`);
      }
      await this.incrementApplyCounter(logger, message);
      await this.finishTask(logger, message, STATUS.SUCCESS);
    } catch (error) {
      await this.finishTask(logger, message, STATUS.ERROR, error.message);
    }
  }
}
