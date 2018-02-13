import logger from '../logger';
import { isUserAuthorized } from 'global/sessionUtils';

const handleError = (res, error) => {
  logger.debug(error);
  res
    .status(401)
    .json({result: 'failed', reason: 'Access Denied!'});
};

// this middleware checks whether request has valid session and stores used data into request
export default (req, res, next) => {
  try {
    const session = req.session;
    const isAuthorized = isUserAuthorized(session);

    if (!isAuthorized) {
      handleError(res, `Auth middleware: invalid user session - Access Denied! ${JSON.stringify(session)}`);
    } else {
      logger.debug(`Auth middleware: valid user session ${JSON.stringify(session)}`);
      // and continue processing request
      next();
    }
  } catch (error) {
    handleError(res, `Auth middleware: invalid user session - Access Denied! ${error}`);
  }
};
