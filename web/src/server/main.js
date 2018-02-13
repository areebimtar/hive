// build static resources
import sr from './staticResources'; // eslint-disable-line no-unused-vars

import _ from 'lodash';
import Promise from 'bluebird';
import express from 'express';
import config from './config';
import Db from 'global/postgresDb';
import {App} from './app';
import logger from './logger';
import http from 'http';
import https from 'https';
import redirectServer from './redirectServer';
import createNextTickLogger from './nextTickLogger';

createNextTickLogger(config);

const expressServer = express();

function listen(server, resolve, reject) {
  function errorHandler(error) {
    logger.error(error);
    server.removeListener('error', errorHandler);
    reject();
  }

  server.on('error', errorHandler);

  server.on('clientError', (error) => {
    logger.info(`clientError: ${JSON.stringify(error)}`);
  });

  server.listen(config.serverPort, () => {
    logger.info(
      `${config.serverScheme} server listening on port ${config.serverPort}`);

    server.removeListener('error', errorHandler);
    resolve();
  });
}

function startServer() {
  logger.info(`Starting ${config.env} server`);
  return new Promise((resolve, reject) => {
    if (config.serverScheme === 'https') {
      const options = {
        key: config.cryptoContent.privateKey,
        cert: config.cryptoContent.certificate
      };

      const server = https.createServer(options, expressServer);
      listen(server, resolve, reject);

      return;
    }

    if (config.serverScheme === 'http') {
      const server = http.createServer(expressServer);
      listen(server, resolve, reject);

      return;
    }

    const error = new Error(`bad uri scheme: ${config.serverScheme}`);
    logger.error(error);
    reject();
  });
}

const dbConnections = _.reduce(config.db, (connections, dbConfig, dbName) =>
  _.set(connections, dbName, new Db(dbConfig)), {});

const app = new App(expressServer, dbConnections, config);

app.init()
  .then(startServer)
  .then(redirectServer.start.bind(redirectServer, config.httpPort, config.webUrl))
  .catch( e => {
    logger.error(e);
  });
