import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import DocumentMeta from 'react-document-meta';
import * as Actions from './actions';
import config from './config';

import Routes from './Routes';

import './less/style.less';

export default class Application extends Component {

  static propTypes = {
    store: PropTypes.object.isRequired
  };

  componentWillMount() {
    this.props.store.dispatch(Actions.Application.bootstrap());
  }

  render() {
    const { store } = this.props;
    return (
      <div>
        <DocumentMeta {...config.app}/>
        <Provider store={store}>
          <Routes store={store} />
        </Provider>
      </div>
    );
  }
}
