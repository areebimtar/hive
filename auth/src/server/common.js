import api from '../lib/api';
import config from './config';
import logger from './logger';
export { isUserAuthorized, httpRedirect } from 'global/sessionUtils';

export const redirectAuthorizedLogin = (response) => {
  response.status(200);
  response.json(new api.LoginResult('success', config.webUrl));
};

export const retryLogin = (response) => {
  response.json(
    new api.LoginResult('error', 'Username or password incorrect.'));
};

export const authorizeUser = (request, response, user) => {
  // add user info into session
  request.session.userId = user.id;
  request.session.email = user.email;
  request.session.firstName = user.first_name;
  request.session.lastName = user.last_name;
  request.session.loginCount = user.login_count;
  request.session.userName = user.email;
  request.session.companyId = user.company_id;
  request.session.db = user.db;

  redirectAuthorizedLogin(response);
};

export const logoutUser = (request, response) => {
  delete request.session.userId;
  delete request.session.email;
  delete request.session.firstName;
  delete request.session.lastName;
  delete request.session.loginCount;
  delete request.session.userName;
  delete request.session.companyId;
  delete request.session.db;

  response.status(302)
    .location(config.authUrl)
    .end();
};

export const startServer = (server, port, scheme, name) => {
  server.on('error', (error) => {
    logger.error(name + 'failed to start, error: ' + error);
    process.exit(1);
  });
  server.on('clientError', (error) => {
    logger.info(name + ' received client connection error: ' + error);
  });

  server.listen(port, () => {
    logger.info(scheme + ' ' + name + ' listening on port: ' + port);
  });
};
