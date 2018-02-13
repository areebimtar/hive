import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ReassignShopButton extends Component {
  static propTypes = {
    onClick: PropTypes.func.isRequired
  }

  render() {
    return (
      <a className="waves-effect waves-light btn  blue lighten-2"
        onClick={this.props.onClick}>
        <i className="material-icons left">group</i>
        reassign
      </a>
    );
  }
}

export default ReassignShopButton;
