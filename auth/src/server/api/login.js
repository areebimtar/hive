import _ from 'lodash';
import * as utils from '../utils';
import bcrypt from 'bcryptjs';

import * as common from '../common';
import logger from '../logger';

const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

const validateUserCredentials = (credentials) => {
  if (!credentials) { return false; }

  return nonEmptyString(credentials.username) && nonEmptyString(credentials.password);
};

const validateUser = (user, password) => {
  if (!user || !user.hash) { return false; }

  return bcrypt.compareSync(password, user.hash);
};

export default (config, models) => (request, response, next) => { // eslint-disable-line no-unused-vars
  const isAuthorized = common.isUserAuthorized(request.session);

  logger.debug(`Is user already autorized: ${JSON.stringify(isAuthorized)}`);
  // is user already autorized?
  if (isAuthorized) {
    return common.redirectAuthorizedLogin(response);
  }

  // get user credentials
  const credentials = request.body;
  logger.debug(`User's credentials: ${JSON.stringify(credentials)}`);
  // are credentials in valid format?
  if (!validateUserCredentials(credentials)) {
    logger.debug('Credentials data are not valid');
    // nope, fail login
    return common.retryLogin(response);
  }

  // username is email and we support only all lower case emails
  const username = utils.cleanEmail(credentials.username);
  // find user in db
  return models.users.getByEmail(username)
    .then(user => {
      logger.debug(`User data for ${username}: ${JSON.stringify(user)}`);
      // is user valid?
      if (!validateUser(user, credentials.password)) {
        logger.debug(`User ${username} is not authorized`);
        // nope, fail login
        return common.retryLogin(response);
      }

      logger.debug(`User ${username} is authorized`);
      return common.authorizeUser(request, response, user);
    })
    .then(() => {
      return models.users.updateUserLoginStatisticsByEmail(username);
    })
    .catch(error => response.json({ result: 'error', data: error.toString() }));
};
