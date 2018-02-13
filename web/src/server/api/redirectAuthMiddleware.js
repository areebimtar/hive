import logger from '../logger';
import { isUserAuthorized, httpRedirect } from 'global/sessionUtils';

// this middleware checks whether request has valid session
export default (config) => (req, res, next) => {
  try {
    const session = req.session;
    const isAuthorized = isUserAuthorized(session);

    logger.debug(`Redirect Auth middleware: Session data: ${JSON.stringify(session)}`);
    logger.debug(`Is user already authorized: ${JSON.stringify(isAuthorized)}`);

    if (!isAuthorized) {
      logger.debug('Redirect Auth middleware: Access Denied!');

      if (!session || !session.seen) { // session is missing = new user
        httpRedirect(res, config.signupPage);
      } else { // user is not logged in
        httpRedirect(res, config.loginPage);
      }
    } else {
      logger.debug(`Redirect Auth middleware: valid user session ${JSON.stringify(session)}`);
      // and continue processing request
      next();
    }
  } catch (error) {
    logger.debug(`Redirect Auth middleware: invalid user session - Access Denied! ${error}`);
    httpRedirect(res, config.loginPage);
  }
};
