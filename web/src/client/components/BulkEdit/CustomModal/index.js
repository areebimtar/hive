import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-modal';


// unfortunatelly, modal uses inline styles :(
const customStyles = {
  overlay: {
    zIndex: 100
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)'
  }
};

class CustomModal extends Component {
  static propTypes = {
    children: PropTypes.array,
    contentLabel: PropTypes.string.isRequired,
    open: PropTypes.bool,
    onRequestClose: PropTypes.func,
    portalClassName: PropTypes.string
  };

  static defaultProps = {
    onRequestClose: _.noop,
    portalClassName: 'ReactModalPortal'
  };

  render() {
    const { contentLabel, open, onRequestClose, portalClassName } = this.props;

    return (
      <Modal isOpen={open} onRequestClose={() => onRequestClose()} style={customStyles} contentLabel={contentLabel} portalClassName={portalClassName}>
        { this.props.children }
      </Modal>
    );
  }
}

export default CustomModal;
