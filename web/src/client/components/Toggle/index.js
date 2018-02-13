import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class Toggle extends Component {
  static propTypes = {
    value: PropTypes.bool,
    className: PropTypes.string,
    onChange: PropTypes.func
  };

  onClick() {
    this.props.onChange(this.props.value ? false : true);
  }

  render() {
    const { value, className } = this.props;
    const classes = classNames('hive-toggle', className, value ? 'checked' : '');

    return (
      <div className={classes} onClick={this.onClick.bind(this)}/>
    );
  }
}
