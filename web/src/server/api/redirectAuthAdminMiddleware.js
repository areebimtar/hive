import logger from '../logger';
import adminAuthMiddleware from './admin/adminAuthMiddleware';
import { httpRedirect } from 'global/sessionUtils';

// Reuses adminAuthMiddleware but adds custom error handler which sends redirect
export default (config, dbModels) => {
  return adminAuthMiddleware(config, dbModels, logger, (res, error) => {
    logger.debug(`Redirect Auth Admin middleware: error - Access Denied! ${error}`);
    httpRedirect(res, config.loginPage);
  });
};
