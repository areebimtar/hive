import { fromJS } from 'immutable';

import * as CONSTANTS from './constants';

export default fromJS({
  errors: [],
  login: {
    loginState: CONSTANTS.HOME_PAGE
  },
  config: {
    welcomeUrl: '/'
  }
});
