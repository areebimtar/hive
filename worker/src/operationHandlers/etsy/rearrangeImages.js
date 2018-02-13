import _ from 'lodash';
import Promise from 'bluebird';
// import logger from 'app/logger'; // TODO: Uncomment this when babel6 issue will be solved

// import Etsy from 'global/modules/etsy';
import Etsy from '../../../../shared/modules/etsy'; // TODO: Remove this when babel6 issues will be fixed

// import { FIELDS } from 'global/modules/etsy/constants';
import { FIELDS } from '../../../../shared/modules/etsy/constants'; // TODO: Remove this when babel6 issues will be fixed
import S3Images from '../../../../shared/modules/aws';

function getProduct(models, productId) {
  return models.products.getByIds([productId])
    .then((products) => {
      if (products.length === 0) { throw new Error('There is no product for image'); } // Done
      if (products.length > 1) { throw new Error('Too many products returned.'); }

      return products[0];
    });
}

function getImage(models, imageId) {
  return models.images.getByIds([imageId])
    .then((images) => {
      if (!images || (images.length === 0)) { return Promise.resolve({ result: 'succeeded' }); } // Done
      if (images.length > 1) { throw new Error('Too many images returned.'); }

      return images[0];
    });
}

async function getImageData(models, imageId, bucket) {
  const velaImage = await models.compositeRequests.getVelaImageByImageId(imageId);
  if (!velaImage) { throw new Error(`Image data is mising image ID: ${imageId}`); }
  const s3Image = await bucket.getImage(velaImage.hash);

  return {
    data: s3Image.Body,
    hash: velaImage.hash,
    mime: velaImage.mime
  };
}

function detachImage(models, logger, etsyImageId, etsy, accountProperties, shop, product, requests) {
  logger.debug(`Detach etsy image ${etsyImageId}`);
  if (!etsyImageId) { return undefined; }
  return etsy.deleteImage(accountProperties, shop.id, product.listing_id, etsyImageId, requests);
}

function attachImage(models, logger, imageId, imageRank, etsy, accountProperties, shop, product, requests, bucket) {
  logger.debug(`Attach image ${imageId} with rank ${imageRank}`);
  return getImage(models, imageId)
    .then((image) => {
      if (image.channel_image_id) {
        logger.debug(`Reattach image ${image.channel_image_id}`);
        return etsy.setImageRank(accountProperties, shop.id, product.listing_id, image.channel_image_id, imageRank, requests);
      }

      logger.debug('Upload new image');
      return getImageData(models, imageId, bucket)
        .then(imageData => {
          return etsy.uploadNewImage(accountProperties, shop.id, product.listing_id, imageRank, imageData.data, imageData.mime, imageData.hash, requests);
        })
        .then((result) => {
          // Update image in db, set channel image id and thumbnail url
          const newImage = {
            id: image.id,
            channel_image_id: result.id,
            thumbnail_url: result.thumbnailUrl,
            fullsize_url: result.fullsizeUrl
          };

          return models.images.update(newImage)
            .then(() => { return newImage; });
        })
        .then((result) => {
          logger.debug('Image has been updated in db');
          logger.debug(result);
        });
    })
    .then(() => {
      return undefined;
    });
}

function getAllImages(accountProperties, shop, product, etsy, requests) {
  return etsy.getAllImages(accountProperties, shop.id, product.listing_id, requests);
}

function removePhotosFromChangedProperties(models, product) {
  const changedProperties = _.get(product, FIELDS.CHANGED_PROPERTIES, []);
  const updatedChangedProperties = _.filter(changedProperties, tag => tag !== FIELDS.PHOTOS);
  return models.products.update({ id: product.id, [FIELDS.CHANGED_PROPERTIES]: updatedChangedProperties });
}

export async function start(config, models, logger, data, unusedTaskId, unusedManager, requests, rateLimiter) {
  logger.info(`rearrangeImages ${data}`);
  if (!data || (!_.isString(data) && !_.isNumber(data))) { return Promise.reject(new TypeError(`Invalid product id: ${data}`)); }

  const productId = parseInt(data, 10);

  const etsy = new Etsy(config, rateLimiter, logger);

  const product = await getProduct(models, productId);
  const [shop, account] = await models.compositeRequests.getShopAccountByShopId(product.shop_id);

  const bucketName = _.get(config, 'AWS.images.bucketName');
  const awsConfig = _.get(config, 'AWS.images');
  const bucket = new S3Images(bucketName, awsConfig, logger);

  let promise = Promise.resolve();

  const etsyImages = await getAllImages(account, shop, product, etsy, requests);
  _.each(etsyImages, etsyImage => {
    promise = promise.then(detachImage.bind(null, models, logger, etsyImage.listing_image_id, etsy, account, shop, product, requests));
  });

  _.each(product[FIELDS.PHOTOS], (imageId, index) => {
    promise = promise.then(attachImage.bind(null, models, logger, imageId, index + 1, etsy, account, shop, product, requests, bucket));
  });

  const result = await promise;

  await removePhotosFromChangedProperties(models, product);

  return { result: 'succeeded', data: result };
}
