import logger from './logger';


// this middleware log all server responses
export default (req, res, next) => {
  const { send } = res;

  // wrap send function so we can log server response
  res.send = (payload) => {
    logger.debug(`Server response to ${req.method} ${req.originalUrl}`);
    logger.debug(`${payload}`);

    send.bind(res)(payload);
  };
  // continue with next middleware
  next();
};
