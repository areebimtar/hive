import React from 'react';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';

import HomePage from './components/HomePage';
import LoginForm from './components/LoginForm';
import CreateAccountForm from './components/CreateAccountForm';
import ToRoot from './components/ToRoot';
import ResetPasswordPage from './components/ResetPasswordPage';
import SetPasswordPage from './components/SetPasswordPage';

export default (/* props */) =>
      <Router history={browserHistory} >
        <Route path="/" component={HomePage}>
          <IndexRoute component={LoginForm} />
          <Route path="login" component={LoginForm} />
          <Route path="createAccount" component={CreateAccountForm} />
          <Route path="resetPassword" component={ResetPasswordPage} />
          <Route path="resetPassword/:linkId/:linkData" component={SetPasswordPage} />
          <Route path="*" component={ToRoot} />
        </Route>
      </Router>;
