import _ from 'lodash';

import logger from '../logger';
import * as utils from '../utils';
import * as common from '../common';
import validateCreateAccountInfo from '../../shared/createAccountValidation';

const argumentsAreValid = values => values && _.isEmpty(validateCreateAccountInfo(values));

const errorMsg = 'Create account data are invalid';

export default (config, models) => (request, response, next) => { // eslint-disable-line no-unused-vars
  const requestInfo = request.body;
  logger.debug(`Create Account data: ${JSON.stringify(requestInfo)}`);

  // validate Create account info
  if (!argumentsAreValid(requestInfo)) {
    logger.debug(errorMsg);
    return response.json({ result: 'error', data: errorMsg });
  }

  const {firstname, lastname, password} = requestInfo;
  const email = utils.cleanEmail(requestInfo.email);

  const hash = utils.createPasswordHash(password);
  return models.users.createUser(firstname, lastname, email, hash, config.users.newUserDbName)
    .then(user => {
      logger.debug(`Created new user (id=${user.id}, name="${user.first_name} ${user.last_name}", email=${user.email})`);

      return common.authorizeUser(request, response, user);
    }).catch( error => {
      logger.error(`Failed to create new user: ${error.toString()}`);
      response.json({ result: 'error', data: error.toString()});
    });
};
