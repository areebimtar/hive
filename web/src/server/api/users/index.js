import express from 'express';
import getUserProfile from './getUserProfile';
import getJWTData from './getJWTData';
import updateUserProfile from './updateUserProfile';

const router = express.Router(); // eslint-disable-line new-cap

export default (config, dbModels, rabbitClient) => {
  const wrapper = (routeHandler) => async (req, res) => {
    const { session: { db } } = req;

    const models = dbModels[db];
    return routeHandler(config, models, rabbitClient, req, res);
  };

  const usersRouter = express.Router({mergeParams: true}); // eslint-disable-line new-cap
  // add GET /users/current route
  usersRouter.get('/', wrapper(getUserProfile));
  usersRouter.get('/jwtdata', wrapper(getJWTData));
  usersRouter.put('/', wrapper(updateUserProfile));

  // use users routes in main router
  router.use('/users', usersRouter);

  return router;
};
