import logger from './logger';

export const startServer = (server, port, scheme, name) => {
  server.on('error', (error) => {
    logger.error(name + 'failed to start, error: ' + error);
    process.exit(1);
  });
  server.on('clientError', (error) => {
    logger.info(name + ' received client connection error: ' + error);
  });

  server.listen(port, () => {
    logger.info(scheme + ' ' + name + ' listening on port: ' + port);
  });
};
