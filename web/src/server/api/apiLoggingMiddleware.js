import logger from '../logger';


// this middleware logs all server requests
export default (req, res, next) => {
  logger.debug(`Server request ${JSON.stringify(req.session)} ${req.method} ${req.originalUrl}`);
  next();
};
