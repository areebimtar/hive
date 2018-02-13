import * as common from './common';
import express from 'express';
import http from 'http';
import { httpRedirect } from 'global/sessionUtils';

function start(port, redirectUrl) {
  const app = express();
  const router = express.Router();

  router.use((request, response) => {
    httpRedirect(response, redirectUrl);
  });

  app.use('/', router);

  const server = http.createServer(app);
  common.startServer(server, port, 'http', 'redirect');
}

export default {
  start
};
