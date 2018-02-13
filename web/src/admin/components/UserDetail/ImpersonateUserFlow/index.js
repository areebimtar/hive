import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Modal from '../../Modal';

class ImpersonateUserFlow extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    impersonateUser: PropTypes.func.isRequired
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
    this.props.impersonateUser();
  };

  renderButton() {
    return (
      <a className="waves-effect waves-light btn blue lighten-2"
          onClick={this.openConfirmationModal}>
          <i className="material-icons left">people_outline</i>
          Impersonate
      </a>
    );
  }

  renderConfirmationModal() {
    const { user }  = this.props;
    return (
      <Modal open={this.state.confirmationModalOpen}
        onClose={this.onConfirmationModalClose}>
        <div className="modal-content">
          <h4>Confirmation</h4>
          <p>Are you sure you want to impersonate user <b>{user.email}</b>?</p>
        </div>
        <div className="modal-footer">
          <a className="modal-action waves-effect waves-blue btn-flat"
            onClick={this.onConfirmationModalConfirm}>
            Impersonate user
            </a>
          <a className="modal-action waves-effect waves-blue btn-flat"
            onClick={this.onConfirmationModalClose}>
            Cancel
            </a>
        </div>
      </Modal>
    );
  }

  render() {
    return (
      <span>
        {this.renderButton()}
        {this.renderConfirmationModal()}
      </span>
    );
  }

  setConfirmationModalOpen(open) {
    this.setState({ confirmationModalOpen: open });
  }

  openConfirmationModal = () => this.setConfirmationModalOpen(true);
}

export default ImpersonateUserFlow;
