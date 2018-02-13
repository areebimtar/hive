import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';


class CloseButton extends Component {
  static propTypes = {
    onClick: PropTypes.func.isRequired
  };

  render() {
    const {onClick} = this.props;

    return (
      <button className="bulk-edit-close-button"
        onClick={onClick} />
    );
  }
}

export default connect()(CloseButton);
