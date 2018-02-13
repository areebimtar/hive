import React, { Component } from 'react';
import PropTypes from 'prop-types';

const INTERVAL = 10; // 10ms

export default class AutofillCheck extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    onAutofill: PropTypes.func.isRequired,
    interval: PropTypes.number
  }

  componentWillMount() {
    // if the ':-webkit-autofill' pseudoclass is not supported this component does nothing
    try {
      document.querySelectorAll(':-webkit-autofill');
    } catch (e) {
      return;
    }

    const timeout = this.props.interval || INTERVAL;
    const interval = setInterval(this.onInterval, timeout);
    this.setState({ interval });
  }

  componentWillUnmount() {
    clearInterval(this.state.interval);
  }

  onInterval = () => {
    const onAutofill = this.props.onAutofill;
    const container = this.refs.container;
    // get all input fields
    const allInputs = container.querySelectorAll('input');
    // get all input fields with :-webkit-autofill class
    const inputs = container.querySelectorAll(':-webkit-autofill');

    // if all inputs have autofilled value, trigger onAutofill
    if (inputs.length && inputs.length === allInputs.length) {
      clearInterval(this.state.interval);
      onAutofill();
    }
  }

  render() {
    return (
      <div ref="container" className="autofil-wrapper">
        { this.props.children }
      </div>
    );
  }

  state = {}
}
