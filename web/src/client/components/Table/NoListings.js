import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

const stateImages = {
  active: require('../../img/no-listings/active.png'),
  draft: require('../../img/no-listings/draft.png'),
  expired: require('../../img/no-listings/expired.png'),
  inactive: require('../../img/no-listings/inactive.png')
};

export default class NoListings extends Component {
  static propTypes = {
    state: PropTypes.string
  };

  render() {
    const imageFile = stateImages[this.props.state];
    if (!imageFile) return null;
    const message = `No  ${_.capitalize(this.props.state)} Listings`;
    return (
      <div className="no-listings-placeholder">
        <div className="wrapper">
          <img src={imageFile} />
          <div className="message">{message}</div>
        </div>
      </div>
    );
  }
}
