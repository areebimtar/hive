import express from 'express';
import bodyParser from 'body-parser';

import shopsHandlers from './shops';

import shopsAuthMiddleware from './shopsAuthMiddleware';

const MAX_BODY_SIZE = 25 * 1024 * 1024; // 25 MB

const router = express.Router({mergeParams: true}); // eslint-disable-line new-cap
router.use(bodyParser.json({limit: MAX_BODY_SIZE}));

export default (config, dbModels, rabbitClient) => {
  const handlers = shopsHandlers(config, dbModels, rabbitClient);

  const auth = shopsAuthMiddleware(config, dbModels);
  // add GET all shops
  router.get('/shops', handlers.get);
  // add GET products for single shop
  router.get('/shops/:shopId/products', auth, handlers.products.getProducts);
  // add PUT products for single shop (apply operations)
  router.put('/shops/:shopId/products', auth, handlers.products.applyOperations);
  // add PUT filtered products for single shop (search route)
  router.put('/shops/:shopId/products/search', auth, handlers.products.search);
  // add GET channel data (sections, productTypes, vendors, ...)
  router.get('/shops/:shopId/channelData', auth, handlers.getChannelData);

  return router;
};
