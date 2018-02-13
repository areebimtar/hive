import invariant from 'invariant';
import http from 'http';
import https from 'https';
import _ from 'lodash';

import Db from 'global/postgresDb';
import Models from './db/models';
import cfg from './config';
import logger from './logger';
import * as common from './common';
import initializeAPI from './api';


function startHttp(config, db) {
  const routes = initializeAPI(config, db);
  const server = http.createServer(routes);

  common.startServer(server, config.auth.port, config.auth.scheme, 'auth server');
}

function startHttps(config, db) {
  const routes = initializeAPI(config, db);
  const options = {
    key: config.cryptoContent.privateKey,
    cert: config.cryptoContent.certificate
  };

  const server = https.createServer(options, routes);

  common.startServer(server, config.auth.port, config.auth.scheme, 'auth server');
}

function start() {
  // scheme init functions
  const schemeMap = {
    http: startHttp,
    https: startHttps
  };

  // no need to log large buffers with keys
  const simplifiedConfig = _.omit(cfg, 'cryptoContent');
  logger.info('Starting auth server with configuration: ' + JSON.stringify(simplifiedConfig, undefined, 2));

  // If DB queries logging enabled, pass logger instance to db through config
  if (cfg.db && cfg.db.logQueries) {
    cfg.db.logger = logger;
  }
  // create new DB pool
  const db = new Db(cfg.db);
  // get DB models
  const models = new Models(db);

  // get server init function
  const serverInit = schemeMap[cfg.auth.scheme];
  invariant(_.isFunction(serverInit), 'bad uri scheme: ' + cfg.auth.scheme);

  // start server
  serverInit(cfg, models);
}

export default {
  start
};
