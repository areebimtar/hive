import _ from 'lodash';

// This middleware checks whether user is admin, it assumes user is authorized
export default (config, dbModels, logger, errorHandler) => {
  const errorHandlerResolved = errorHandler || ((res, error) => {
    logger.debug(`Admin Auth middleware: error - Access Denied! ${error}`);
    res
      .status(401)
      .json({ result: 'failed', reason: 'Access Denied!' });
  });

  return (req, res, next) => {
    let adminId = _.get(req, 'session.userId');
    let db = _.get(req, 'session.db');
    if (req.session.impersonating && req.session.originalUser) {
      // Admins impersonating users will be authenticated based
      // on their original user ids, not on ids of users
      // they are impersonating.
      adminId = _.get(req, 'session.originalUser.id');
      db = _.get(req, 'session.originalUser.db');
    }
    const models = dbModels[db];
    return models.auth.users.isAdmin(adminId).then(isAdmin => {
      if (isAdmin) {
        next(); // Continue processing request
        return null; // Needed to silence warning about promise not returning anything
      } else {
        throw new Error('User is not admin');
      }
    }).catch((error) => {
      errorHandlerResolved(res, error);
    });
  };
};
