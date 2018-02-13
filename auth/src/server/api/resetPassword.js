import Promise from 'bluebird';
import crypto from 'crypto';
import { Mandrill } from 'mandrill-api';
import _ from 'lodash';

import logger from '../logger';
import * as utils from '../utils';


const nonEmptyString = (value) => {
  return _.isString(value) && !_.isEmpty(value);
};

/*
 * Returns promise to send reset email
 *  - it resolves to undefined if operation was successful
 *  - it rejects if there was error during processing
 */
function sendEmail(apikey, link, email) {
  const textMessage = `To reset your password, please follow this link: ${link}`;
  const message = {
    text: textMessage,
    subject: 'Password reset',
    from_email: 'support@getvela.com',
    from_name: 'Vela support',
    to: [{ email: email, type: 'to' }]
  };

  return new Promise((resolve, reject) => {
    return new Mandrill(apikey).messages.send({message: message}, resolve, reject);
  }).then( (result) => {  // [{email, status, reject_reason, _id}]
    logger.debug('Result of mandrill sent: ', result);
    const status = result && result[0] && result[0].status;
    const emailSent = status === 'sent' || status === 'queued';
    if (!emailSent) {
      throw new Error(`Mandrill failed to send the email, status = ${status}`);
    }
  });
}


export default (config, models) => (request, response, next) => { // eslint-disable-line no-unused-vars
  const requestInfo = request.body;
  logger.debug(`Reset password request: ${JSON.stringify(requestInfo)}`);

  // validate request invite info
  const userEmail = utils.cleanEmail(_.get(requestInfo, 'email'));
  if (!nonEmptyString(userEmail)) {
    logger.debug('Reset password request data are invalid');
    return response.json({ error: 'Reset password request data are invalid' });
  }

  return models.users.getByEmail(userEmail).then((user) => {
    if (!user) {
      // Silent failure - do not report failure back to client so they can't guess emails
      logger.info(`Password reset requested for a non-existing user (${userEmail})`);
      return response.json({ result: 'success'});
    }
    const userId = user.id;
    const linkData = crypto.randomBytes(16).toString('hex');

    return models.resetPassword.insert(userId, linkData).then((id) => {
      const link = `${config.authUrl}/resetPassword/${id}/${linkData}`;
      const MANDRILL_APIKEY = config.mandrill && config.mandrill.apikey;

      return sendEmail(MANDRILL_APIKEY, link, userEmail)
        .then( () => response.json({ result: 'success' }))
        .catch( (error) => {
          logger.info(`Could not send reset password email via Mandrill: ${error.message}`);
          return response.json({ error: `Could not send email with reset link to ${userEmail}`});
        });
    });
  }).catch(error => response.json({ error: error.toString() }));
};
