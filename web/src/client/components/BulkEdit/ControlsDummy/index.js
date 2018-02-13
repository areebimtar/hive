import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

// import * as Actions from '../../../actions';


export class ControlsDummy extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object
  };

  render() {
    return (
      <div className="bulk-edit--actions" />
    );
  }
}

export default connect()(ControlsDummy);
