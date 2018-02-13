import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CustomModal from '../CustomModal';

import { CLOSE_MODAL_CONSTS } from 'app/client/constants/bulkEdit';

class CloseModal extends Component {
  static propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func
  };

  render() {
    const { open, onClose } = this.props;

    return (
      <CustomModal open={open} onRequestClose={() => onClose(CLOSE_MODAL_CONSTS.CLOSE)} contentLabel="BulkCloseModal">
        <h2>Are you sure?</h2>
        <div>
          You have updates that have NOT been synced. Closing this page without syncing will cause all updates to be lost.
        </div>
        <div className="bulk-edit-modal-buttons">
          <button onClick={() => onClose(CLOSE_MODAL_CONSTS.CLOSE)}>Close</button>
          <button onClick={() => onClose(CLOSE_MODAL_CONSTS.KEEP_EDITING)}>Keep Editing</button>
          <button className="bulk-edit-sync-button action-button" onClick={() => onClose(CLOSE_MODAL_CONSTS.SYNC_UPDATES)}><span>Sync Updates</span></button>
        </div>
      </CustomModal>
    );
  }
}

export default CloseModal;
