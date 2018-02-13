import express from 'express';

import logger from '../../logger';
import adminAuthMiddleware from './adminAuthMiddleware';

import getUserInfo from './getUserInfo';
import getShopCounts from './shops/getShopCounts';
import searchShops from './shops/searchShops';
import getShopById from './shops/getShopById';
import getShopOwners from './shops/getShopOwners';
import shopsHandlers from '../shops/shops';
import reassignShop from './shops/reassignShop';
import deleteShop from './shops/deleteShop';
import syncShop from './shops/syncShop';
import searchUsers from './users/searchUsers';
import getUserById from './users/getUserById';
import getUserShops from './users/getUserShops';
import getImpresonation from './impersonation/getImpresonation';
import impersonateUser from './impersonation/impersonateUser';
import cancelImpersonation from './impersonation/cancelImpersonation';

const router = express.Router(); // eslint-disable-line new-cap

export default (config, dbModels, rabbitClient) => {
  const wrapper = (routeHandler) => async (req, res) => {
    const { session: { db } } = req;

    const models = dbModels[db];
    return routeHandler(config, models, rabbitClient, req, res);
  };

  const handlers = shopsHandlers(config, dbModels, rabbitClient);

  const adminRouter = express.Router({mergeParams: true}); // eslint-disable-line new-cap

  adminRouter.get('/userInfo', wrapper(getUserInfo));

  adminRouter.get('/shops/counts', wrapper(getShopCounts));

  adminRouter.get('/shops/search', wrapper(searchShops));

  adminRouter.get('/shops/:shopId', wrapper(getShopById));

  adminRouter.delete('/shops/:shopId', wrapper(deleteShop));

  adminRouter.get('/shops/:shopId/sync', wrapper(syncShop));

  adminRouter.get('/shops/:shopId/owners', wrapper(getShopOwners));

  adminRouter.get('/shops/:shopId/products/search', handlers.products.search);

  adminRouter.get('/shops/:shopId/reassign/:userId', wrapper(reassignShop));

  adminRouter.get('/users/search', wrapper(searchUsers));

  adminRouter.get('/users/:userId', wrapper(getUserById));

  adminRouter.get('/users/:userId/shops', wrapper(getUserShops));

  adminRouter.get('/impersonation', wrapper(getImpresonation));

  adminRouter.get('/impersonation/impersonate/:userId', wrapper(impersonateUser));

  adminRouter.get('/impersonation/cancel', wrapper(cancelImpersonation));

  // use admin routes in main router
  router.use('/admin', adminAuthMiddleware(config, dbModels, logger), adminRouter);
  return router;
};
