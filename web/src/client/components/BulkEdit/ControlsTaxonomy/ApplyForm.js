import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';


export class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    value: PropTypes.number
  };

  render() {
    const classes = classNames({ apply: true, inactive: !this.props.value });
    return (
      <div className="bulk-edit--actionform">
        <button className={classes} onClick={this.props.onSubmit} disabled={!this.props.value}>Apply</button>
      </div>
    );
  }
}

export default connect()(ApplyForm);
