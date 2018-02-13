import logger from './logger';


// this middleware logs all server requests
export default (req, res, next) => {
  logger.info(`Server request ${req.method} ${req.originalUrl}`);
  next();
};
