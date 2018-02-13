import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Modal from '../../Modal';

class DeleteShopButton extends Component {
  static propTypes = {
    deleteShop: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props);
    this.state = {
      confirmationModalOpen: false
    };
  }

  onConfirmationModalClose = () => this.setConfirmationModalOpen(false);

  onConfirmationModalConfirm = () => {
    this.setConfirmationModalOpen(false);
    this.props.deleteShop();
  };

  render() {
    return (
      <span>
        <a className="waves-effect waves-light btn red"
          onClick={this.openConfirmationModal}>
          <i className="material-icons left">delete</i>
          delete
        </a>

        <Modal open={this.state.confirmationModalOpen}
          onClose={this.onConfirmationModalClose}>
          <div className="modal-content">
            <h4>Confirmation</h4>
            <p>Are you sure you want to delete this shop?</p>
          </div>
          <div className="modal-footer">
            <a className="modal-action waves-effect waves-blue btn-flat"
              onClick={this.onConfirmationModalConfirm}>
              Delete shop
            </a>
            <a className="modal-action waves-effect waves-blue btn-flat"
              onClick={this.onConfirmationModalClose}>
              Cancel
            </a>
          </div>
        </Modal>
      </span>
    );
  }

  setConfirmationModalOpen(open) {
    this.setState({ confirmationModalOpen: open });
  }

  openConfirmationModal = () => this.setConfirmationModalOpen(true);
}

export default DeleteShopButton;
