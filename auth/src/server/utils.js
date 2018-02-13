import bcrypt from 'bcryptjs';
import _ from 'lodash';

export function createPasswordHash(password) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  return hash;
}

export function cleanEmail(email) {
  return _.isString(email) ? _.trim(email.toLowerCase()) : email;
}
