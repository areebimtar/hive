import {Users} from './users';
import {ResetPassword} from './resetPassword';

export default function(db) {
  return {
    db: db,
    users: new Users(db),
    resetPassword: new ResetPassword(db)
  };
}
