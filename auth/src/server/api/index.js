import express from 'express';
import session from 'express-session';
import pgSessionStoreCreator from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import bodyparser from 'body-parser';
import fs from 'fs';
import logger from '../logger';
import * as common from '../common';

import apiLoggingMiddleware from '../apiLoggingMiddleware';
import apiResponseLoggingMiddleware from '../apiResponseLoggingMiddleware';

import loginRoute from './login';
import logoutRoute from './logout';
import requestResetPasswordRoute from './resetPassword';
import setPasswordRoute from './setPassword';
import createAccountRoute from './createAccount';

const pgSessionStore = pgSessionStoreCreator(session);

const clientDir = 'dist/auth/client';
const indexHtml = fs.readFileSync(clientDir + '/index.html');

const resetPasswordRoutes = (config, models) => {
  const resetPasswordRouter = express.Router();
  resetPasswordRouter.post('/request', requestResetPasswordRoute(config, models));
  resetPasswordRouter.post('/setPassword', setPasswordRoute(config, models));

  return resetPasswordRouter;
};

const authRoutes = (config, models) => {
  const routes = express.Router({mergeParams: true}); // eslint-disable-line new-cap

  routes.post('/login', loginRoute(config, models));
  routes.post('/createAccount', createAccountRoute(config, models));
  routes.use('/resetPassword', resetPasswordRoutes(config, models));

  return routes;
};

const redirectAuthorizedUsers = (config/* , models */) => (request, response, next) => {
  const isAuthorized = common.isUserAuthorized(request.session);

  logger.debug(`Is user already autorized: ${JSON.stringify(isAuthorized)}`);

  if (isAuthorized) {
    logger.debug(`User ${request.session.name} is autorized`);
    return common.httpRedirect(response, config.webUrl);
  }

  logger.debug('User is not autorized');

  return next();
};

const setSeenFlagMiddleware = (request, response, next) => {
  request.session.seen = true;
  return next();
};

export default (config, models) => {
  const app = express();

  // session
  app.use(session({
    secret: config.session.secretKey,
    name: config.session.cookieName,
    resave: true,
    cookie: {
      path: '/',
      domain: config.session.cookieDomain,
      secure: config.session.secureCookie,
      httpOnly: true,
      maxAge: config.session.cookieExpiresIn
    },
    saveUninitialized: true,
    unset: 'destroy',
    store: new pgSessionStore({
      conString: config.session.store.dbConnectionString
    })
  }));
  // log API request (all of them)
  app.use(apiLoggingMiddleware);
  // add cookie parser
  app.use(cookieParser());
  // limit body to 1E6 bytes
  app.use(bodyparser.json({
    limit: 1e6
  }));
  // always set seen flag
  app.use(setSeenFlagMiddleware);
  // add logout route
  app.get('/logout', logoutRoute(config, models));

  // public configuration settings for the frontend to use
  app.get('/api/v1/config', (request, response) => {
    response.json(config.frontendVars);
  });

  // add auth (login) routes
  app.use('/api/v1', apiResponseLoggingMiddleware, authRoutes(config, models));
  // publicly available config variables for client
  // serve static resources, but redirect user if (s)he is already logged in
  app.use('/', redirectAuthorizedUsers(config, models), express.static(clientDir));

  // serve index.html on every unhandled routes
  app.use(redirectAuthorizedUsers(config, models), (request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.send(indexHtml);
    response.end();
  });

  return app;
};
