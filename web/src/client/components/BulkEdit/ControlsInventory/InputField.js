import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class InputField extends Component {
  static propTypes = {
    value: PropTypes.any,
    status: PropTypes.string,
    autoFocus: PropTypes.bool,
    className: PropTypes.string,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    onChange: PropTypes.func,
    onFinish: PropTypes.func
  };

  static defaultProps = {
    value: '',
    status: '',
    autoFocus: true,
    className: '',
    bulk: true,
    inline: false,
    onChange: _.noop,
    onFinish: _.noop
  }

  constructor() {
    super();
    this.state = {};
  }

  shouldComponentUpdate(nextProps) {
    return this.props.value !== nextProps.value ||
      this.props.status !== nextProps.status;
  }

  onChange = (event) => {
    const { onChange } = this.props;
    const { value } = event.target;

    onChange(value);
  }

  onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.stopPropagation();
      this.props.onFinish();
    }
  }

  getValue() {
    if (this.state.isModified) {
      return this.state.value;
    }

    return this.props.value;
  }

  render() {
    const { status, className, autoFocus, bulk, inline } = this.props;
    const statusMsg = this.state.isModified ? this.state.status : status;
    const showError = statusMsg && (bulk || inline);

    return (
      <div>
        <input
          className={className}
          value={this.getValue()}
          autoFocus={autoFocus}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}/>
        { showError && <div className="message error">{statusMsg}</div> }
      </div>
    );
  }
}
