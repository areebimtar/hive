import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class NoShops extends Component {
  static propTypes = {
    children: PropTypes.object
  };


  render() {
    const { children } = this.props;

    return children && (
      <div className="special-page">
        <div className="no-shops-landing">
          <div className="logo-link" />
          <div className="title">Welcome to Vela!</div>
          { React.cloneElement(children) }
        </div>
      </div>
    );
  }
}
