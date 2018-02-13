import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import DocumentMeta from 'react-document-meta';
import config from './config';

import * as Actions from './actions';
import Routes from './Routes';

import './less/style.less';
import 'react-widgets/lib/less/react-widgets.less';
import 'react-image-gallery/src/ImageGallery.scss';

export default class Application extends Component {

  static propTypes = {
    store: PropTypes.object.isRequired
  };

  componentWillMount() {
    this.props.store.dispatch(Actions.Application.bootstrap());
  }

  render() {
    return (
      <div>
        <DocumentMeta {...config.app}/>
        <Provider store={this.props.store}>
          <Routes />
        </Provider>
      </div>
    );
  }
}
