import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import * as Actions from '../actions';
import Routes from '../Routes';

import '../../../../web/src/client/less/style.less';

import ReactIntercom from 'react-intercom';

export default class Application extends Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  };

  componentWillMount() {
    this.props.store.dispatch(Actions.Application.bootstrap());
  }

  render() {
    const intercomAppID = process.env.HIVE_INTERCOM_APP_ID;
    const ReactIntercomComponent = intercomAppID ? <ReactIntercom appID={intercomAppID} /> : null;
    return (
      <div>
        {ReactIntercomComponent}
        <Provider store={this.props.store}>
          <Routes />
        </Provider>
      </div>
    );
  }
}
