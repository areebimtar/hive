const invariant = require('invariant');

const versionPath = '/api/v1';
const loginPath = versionPath + '/login';
const logoutPath = versionPath + '/logout';

function LoginResult(result, data) {
  invariant((result === 'success') || (result === 'error'),
    'Wrong result value');

  this.result = result;
  this.data = data;
}

module.exports = {
  loginPath: loginPath,
  logoutPath: logoutPath,
  LoginResult: LoginResult
};
