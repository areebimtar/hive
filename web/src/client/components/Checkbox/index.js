import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';


export default class Checkbox extends Component {
  static propTypes = {
    value: PropTypes.bool,
    onChange: PropTypes.func
  }

  render() {
    const { value, onChange } = this.props;
    const classes = classNames('checkbox', value ? 'checked' : '');

    return (
      <div className={classes} onClick={onChange}/>
    );
  }
}
