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
    width: '800px',
    transform: 'translate(-50%, -50%)'
  }
};

class IntroVideoModal extends Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired
  };

  onClose = () => {
    this.props.onClose();
  }

  render() {
    return (
      <div className="intro-video">
        <Modal isOpen={this.props.open} onRequestClose={this.onClose} style={customStyles} contentLabel="IntroModal" >
          <div>
            <div>
              <iframe src="https://player.vimeo.com/video/171054446?autoplay=1&loop=1&color=fff&title=0&byline=0&portrait=0" width="740" height="463" frameBorder="0" />
            </div>
            <button className="intro-video-button" onClick={this.onClose}>Get Started!</button>
          </div>
        </Modal>
      </div>
    );
  }
}

export default IntroVideoModal;
