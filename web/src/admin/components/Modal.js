import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import classNames from 'classnames';

class Modal extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    open: PropTypes.bool.isRequired,
    options: PropTypes.object,
    className: PropTypes.string,
    onClose: PropTypes.func,
    onReady: PropTypes.func
  };

  static defaultProps = {
    className: '',
    onClose: _.noop,
    onReady: _.noop
  };

  componentWillReceiveProps(nextProps) {
    const { options, onClose, onReady } = this.props;
    const optionsCallbacks = {
      complete: nextProps.open ? onClose : _.noop,
      ready: nextProps.open ? onReady : _.noop
    };
    window.$(this.modal).modal(_.assign({}, options, optionsCallbacks));

    const shouldUpdate = this.props.open !== nextProps.open;
    this.setState({ shouldUpdate });
  }

  componentDidUpdate() {
    const { open } = this.props;
    const { shouldUpdate } = this.state;
    if (shouldUpdate) {
      if (open) {
        window.$(this.modal).modal('open');
      } else {
        window.$(this.modal).modal('close');
      }
    }
  }

  render() {
    const classes = classNames('modal', this.props.className);
    return (
      <div className={classes}
        ref={modal => { this.modal = modal; }}>
        {this.props.children}
      </div>
    );
  }
}

export default Modal;
