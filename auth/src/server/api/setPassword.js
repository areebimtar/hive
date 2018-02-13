import logger from '../logger';
import * as utils from '../utils';

function validateRequest(requestInfo) {
  if (!requestInfo) { return false; }

  return requestInfo.linkId && requestInfo.linkData && requestInfo.password;
}

export default (config, models) => (request, response, next) => { // eslint-disable-line no-unused-vars
  const requestInfo = request.body;
  logger.debug(`Set password request: ${JSON.stringify(requestInfo)}`);

  if (!validateRequest(requestInfo)) {
    logger.debug('Set password request data are invalid', requestInfo);
    return response.json({ error: 'Set password request data are invalid' });
  }

  const { password, linkData, linkId } = requestInfo;

  return models.resetPassword.getById(linkId).then(row => {
    if (!row) {
      logger.info(`Invalid request, cannot find entry in database with id = ${linkId}`);
      return response.json({ error: 'The link is invalid.'});
    }

    const dbData = row.link_data;
    const modifiedAt = row.created_at;
    const userId = row.user_id;

    if (dbData !== linkData) {
      logger.debug(`The requests data does not match data in DB: ${dbData} != ${linkData}`);
      return response.json({ error: 'The link is invalid.'});
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (modifiedAt < yesterday) {
      logger.debug(`The link is obsolete (db timestamp: ${modifiedAt}, deadline for valid requests ${yesterday})`);
      return response.json({ error: 'We are sorry but the link is no longer valid.'});
    }

    const passwordHash = utils.createPasswordHash(password);

    return models.db.tx((t) => t.batch([
      models.users.updatePasswordHash(userId, passwordHash, t),
      models.resetPassword.removeById(linkId, t)]))
    .then(() => response.json({ result: 'success' }));
  })
  .catch(error => response.json({ error: error.toString() }));
};
