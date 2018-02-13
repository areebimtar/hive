import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Modal from '../../../Modal';

class ConfirmationModal extends Component {
  static propTypes = {
    shop: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired,
    onConfirmed: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
  }

  render() {
    const { user, shop, open, onConfirmed, onClose } = this.props;
    const userEmail = user && user.email;
    return (
      <Modal open={open} onClose={onClose}>
        <div className="modal-content">
          <h4>Confirmation</h4>
          <p>Are you sure you want to reassign shop <b>{shop.name}</b> to user <b>{userEmail}</b> ?</p>
        </div>
        <div className="modal-footer">
          <a className="modal-action waves-effect waves-blue btn-flat"
            onClick={onConfirmed}>
            Reassign
          </a>
          <a className="modal-action waves-effect waves-blue btn-flat"
            onClick={onClose}>
            Cancel
          </a>
        </div>
      </Modal>
    );
  }
}

export default ConfirmationModal;
