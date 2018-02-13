import Db from 'global/postgresDb';

import App from './app';
import logger from './logger';

import config from './config';

if (config.db.logQueries) { // If DB queries logging enabled, pass logger instance to db through config
  config.db.logger = logger;
}

const db = new Db(config.db);
const app = new App(db, config); // Create application instance

app.init();

const sigHandler = () => {
  logger.info('SIGINT / SIGTERM received, handler is terminating.');
  process.exit(0);
};

process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);
