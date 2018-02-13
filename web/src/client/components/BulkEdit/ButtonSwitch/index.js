import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import invariant from 'invariant';


class ButtonSwitch extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    values: PropTypes.array,
    defaultValue: PropTypes.string
  };

  render() {
    const { values } = this.props;
    const value = this.props.value || this.props.defaultValue;
    const leftValue = (values && values.length === 2) ? values[0] : {};
    const rightValue = (values && values.length === 2) ? values[1] : {};
    const leftClasses = classNames({left: true, selected: value === leftValue.value});
    const rightClasses = classNames({right: true, selected: value === rightValue.value});
    return (
      <div className="button-switch">
        <div className={leftClasses} onClick={() => this.toggle(leftValue.value)}>{leftValue.text}</div>
        <div className={rightClasses} onClick={() => this.toggle(rightValue.value)}>{rightValue.text}</div>
      </div>
    );
  }

  toggle = (newValue) => {
    const values = this.props.values;
    invariant(_.isArray(values) && values.length === 2, `Button switch needs proper values array. Got: ${values}`);

    // get current value
    const value = this.props.value || this.props.defaultValue;
    if (!value || value === newValue) { return; }

    // get current value index
    const index = _.findIndex(values, {value: value});
    if (index !== -1) {
      // get new value
      const nextValue = values[1 - index].value;
      // call onChange handler
      this.props.onChange(nextValue);
    }
  };
}

export default connect()(ButtonSwitch);
