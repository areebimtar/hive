import favicon from 'serve-favicon';
import path from 'path';
import fs from 'fs';
import express from 'express';

import queryParamsMiddleware from './queryParamsMiddleware';
import apiLoggingMiddleware from './apiLoggingMiddleware';
import apiResponseLoggingMiddleware from './apiResponseLoggingMiddleware';
import responseTimeLoggingMiddleware from './responseTimeLoggingMiddleware';
import apiAuthMiddleware from './apiAuthMiddleware';
import redirectAuthMiddleware from './redirectAuthMiddleware';
import redirectAuthAdminMiddleware from './redirectAuthAdminMiddleware';
import logoutRoute from './logoutRoute';
import heartbeatRoute from './heartbeatRoute';
import shops from './shops';
import users from './users';
import images from './images';
import admin from './admin';

const introHtmlPath = path.join('.', 'dist', 'web', 'client', 'intro.html');
const introHtml = fs.readFileSync(introHtmlPath, 'utf8');
const introRoute = (request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.send(introHtml);
  response.end();
};

export default function init(server, config, dbModels, rabbitClient) {
  // serve favicon
  server.use(favicon(path.join('.', 'dist', 'web', 'client', 'favicon.ico')));
  // serve static files (also serves index.html on / route)
  server.use(require('serve-static')(path.join('.', 'dist', 'web', 'client'), { dotfiles: 'deny', index: false }));

  server.get('/intro', introRoute);

  // public server configuration for front-end
  server.get('/api/v1/config', (request, response) => {
    response.json(config.frontendVars);
  });

  // middlewares to use on API routes
  const apiMiddlewares = [
    // use authorization middleware (it only checks if user is logged in)
    apiAuthMiddleware,
    // log API response
    apiResponseLoggingMiddleware,
    // change comma sepparated list into array, parse string into number (if appliable)
    queryParamsMiddleware
  ];

  // log API request (all of them)
  server.use(apiLoggingMiddleware);
  // log performance of api requests
  server.use(responseTimeLoggingMiddleware(config.logging));
  // log out route
  server.get('/logout', logoutRoute(config));
  // heartbeat route
  server.get('/heartbeat', heartbeatRoute());


  // configute API routes
  const routes = express.Router({mergeParams: true}); // eslint-disable-line new-cap
  // register shops API routes
  routes.use(shops(config, dbModels, rabbitClient));
  // register users API routes
  routes.use(users(config, dbModels, rabbitClient));
  // register images API routes
  routes.use(images(config, dbModels, rabbitClient));
  // register admin API routes
  routes.use(admin(config, dbModels, rabbitClient));
  // add new routes into /api/v1 namespace
  server.use('/api/v1', ...apiMiddlewares, routes);

  // register handler to serve admin.html
  server.use('/admin',
    [
      redirectAuthMiddleware(config),
      redirectAuthAdminMiddleware(config, dbModels)
    ],
    (req, res) => {
      // assemble path to admin.html
      const adminHtmlPath = path.join('.', 'dist', 'web', 'client', 'admin.html');
      // read admin.html
      const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
      // and send it as response
      res.send(adminHtml);
    });

  // register default handler for serving index.html, this should be last handler
  server.use(redirectAuthMiddleware(config), (req, res) => {
    // assemble path to index.html
    const indexHtmlPath = path.join('.', 'dist', 'web', 'client', 'index.html');
    // read index.html
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    // and send it as response
    res.send(indexHtml);
  });
}
