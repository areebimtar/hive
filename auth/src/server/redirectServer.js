import * as common from './common';
import config from './config';
import express from 'express';
import http from 'http';


function start() {
  const app = express();
  const router = express.Router();

  router.use((request, response) => {
    common.httpRedirect(response, config.authUrl);
  });

  app.use('/', router);

  const server = http.createServer(app);
  common.startServer(server, config.httpPort, 'http', 'redirect');
}

export default {
  start
};
