import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';


class InitialLoading extends Component {
  static propTypes = {
    params: PropTypes.shape({
      shopId: PropTypes.string
    }),
    dispatch: PropTypes.func.isRequired
  };

  render() {
    return (
        <div className="special-page" />
    );
  }
}

export default connect()(InitialLoading);
