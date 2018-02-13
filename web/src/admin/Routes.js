import React from 'react';
import PropTypes from 'prop-types';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';

import Admin from './containers/Admin';
import Dashboard from './containers/Dashboard';
import UsersLookup from './containers/UsersLookup';
import ShopsLookup from './containers/ShopsLookup';
import ShopDetail from './containers/ShopDetail';
import UserDetail from './containers/UserDetail';

import {
  NotFound
} from '../client/containers';

const Routes = props => {
  const history = syncHistoryWithStore(browserHistory, props.store, {
    selectLocationState: state => {
      const routingState = state.getIn(['combined', 'routing']);
      return routingState ? routingState.toJS() : {};
    }
  });
  return (
    <Router history={history}>
      <Route path="/admin" component={Admin}>
        <IndexRoute component={Dashboard} />
        <Route path="shops" component={ShopsLookup} />
        <Route path="users" component={UsersLookup}/>
        <Route path="shops/:shopId" component={ShopDetail} />
        <Route path="users/:userId" component={UserDetail} />
      </Route>
      <Route path="*" component={NotFound} status={404} />
    </Router>
  );
};

Routes.propTypes = {
  store: PropTypes.object.isRequired
};

export default Routes;
