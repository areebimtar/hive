import _ from 'lodash';
import io from 'socket.io-client';

import Db from 'global/postgresDb';
import Models from 'global/db/models';

import App from './app';
import logger from './logger';
import SyncManager from 'global/modules/syncManager/managerClient';

import config from './config';
import { MANAGER } from 'global/constants';

if (process.env.DUMP_CONFIG) {
  logger.debug(config);
}

if (config.db.logQueries) { // If DB queries logging enabled, pass logger instance to db through config
  config.db.logger = logger;
}

function createManager() {
  if (!_.get(config, 'roles.syncShops', true)) { return null; }

  const managerUrl = config.syncManager.url + '/' + MANAGER.WORKERS_ENDPOINT;
  logger.info(`Connect to manager: ${managerUrl}`);

  const socket = io(managerUrl, {
    timeout: 2000     // fail fast
  });

  return new SyncManager(socket, logger);
}

function createAppInstances(db) {
  const numberOfInstaces = _.get(config, 'numberOfInstaces', 10);
  for (let i = 0; i < numberOfInstaces; ++i) {
    const manager = createManager();
    const app = new App(db, Models, config, manager, logger); // Create application instances (Models and logger are passed temporary)

    if (config.terminateOnDisconnect && manager) {
      manager.onDisconnect(() => {
        logger.info('Socket has been disconnected, terminate');
        process.exit(0);
      });
    }

    app.init();
  }
}

const db = new Db(config.db);
createAppInstances(db);

const sigHandler = () => {
  logger.info('SIGINT / SIGTERM received, worker is terminating.');
  process.exit(0);
};

process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

