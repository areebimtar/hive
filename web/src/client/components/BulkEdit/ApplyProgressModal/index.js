import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CustomModal from '../CustomModal';
import { clip } from '../../../utils/misc';


class ApplyProgressModal extends Component {
  static propTypes = {
    open: PropTypes.bool,
    progress: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    channelName: PropTypes.string.isRequired
  };

  getProgressPercentage = () => {
    const { progress, total } = this.props;
    const progressPercentage = total === 0 ? 0 : clip(progress / total, 0, 1);
    return Math.round(progressPercentage * 100);
  }

  render() {
    const { open, channelName } = this.props;

    return (
      <CustomModal open={open} contentLabel="BulkApplyProgressModal" portalClassName="apply-progress-modal">
        <div className="progress-message">Saving to Vela</div>
        <div className="progress-value">{ `${this.getProgressPercentage()}%` }</div>
        <div className="progress-explanation">Sync to {channelName} will start when complete</div>
      </CustomModal>
    );
  }
}

export default ApplyProgressModal;
