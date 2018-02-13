import http from 'http';
import socketIo from 'socket.io';

import Db from 'global/postgresDb';
import Models from 'global/db/models';

import App from './app';
import logger from './logger';

import config from './config';

import { MANAGER } from 'global/constants';

const server = http.createServer();
const io = socketIo(server);

import ManagerAPI from './modules/managerAPI';

logger.info(`Listen at: ${config.serverPort}`);
server.listen(config.serverPort);

if (config.db.logQueries) { // If DB queries logging enabled, pass logger instance to db through config
  config.db.logger = logger;
}

const db = new Db(config.db);
const app = new App(db, Models, config, logger); // Create application instance

app.init()
  .then(() => {
    // Cofigure namespace and handlers for app servers
    const appServers = io.of(`/${MANAGER.APP_SERVERS_ENDPOINT}`);
    appServers.on('connection', app.registerAppServer.bind(app));

    // Configure namespace and handlers for workers
    const workers = io.of(`/${MANAGER.WORKERS_ENDPOINT}`);
    workers.on('connection', app.registerWorker.bind(app));
  });

const api = new ManagerAPI(app, logger);
api.listen(config.manager.APIPort);
