import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as Actions from '../../actions';
import SyncStatusView from './SyncStatusView';
import * as boolString from 'global/modules/utils/boolString';
import { CHANNEL_NAMES } from 'global/constants';

const SYNC = 'sync';

class SyncStatusState extends Component {
  static propTypes = {
    showSyncStatus: PropTypes.bool.isRequired,
    showModal: PropTypes.bool.isRequired,
    remainingCount: PropTypes.number.isRequired,
    onDismissModal: PropTypes.func.isRequired,
    openModal: PropTypes.func.isRequired,
    modalHasBeenDismissed: PropTypes.bool.isRequired,
    isSyncing: PropTypes.bool.isRequired,
    channelName: PropTypes.string
  }

  componentWillReceiveProps(newProps) {
    const syncStatusWillAppear = newProps.isSyncing && !this.props.isSyncing;
    if (syncStatusWillAppear && !newProps.modalHasBeenDismissed) {
      newProps.openModal();
    }
  }

  render() {
    const propsForView = {
      remainingCount: this.props.remainingCount,
      showSyncStatus: this.props.showSyncStatus,
      showModal: this.props.showModal,
      onDismissModal: this.props.onDismissModal,
      channelName: this.props.channelName
    };
    return React.createElement(SyncStatusView, propsForView);
  }
}

const mapStateToProps = (state) => {
  const status = state.getIn(['shops', 'current']);
  const modalHasBeenDismissed = boolString.isTrue(state.getIn(['userProfile', 'syncStatusModalSeen']));
  const inSync = status && (status.get('sync_status') === SYNC);
  const pendingUpdatesInProgress = !!state.getIn(['edit', 'pendingUpdatesInProgress']);
  const remainingCount = inSync ? status.get('to_upload') - status.get('uploaded') : 0;
  const isSyncing = pendingUpdatesInProgress || remainingCount > 0; // TODO: sync + only downloading we don't want to show
  const showModal = boolString.isTrue(state.getIn(['shopView', 'syncStatusModalOpen']));
  const channelName = status && _.capitalize(CHANNEL_NAMES[status.get('channel_id')]);
  const result = {
    isSyncing: isSyncing,
    showSyncStatus: isSyncing || showModal,
    showModal: showModal,
    modalHasBeenDismissed: modalHasBeenDismissed,
    remainingCount: remainingCount,
    channelName: channelName
  };
  return result;
};

const mapDispatchToProps = (dispatch) => ({
  onDismissModal: () => dispatch(Actions.Shops.closeSyncStatusModal()),
  openModal: () => dispatch(Actions.Shops.openSyncStatusModal())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SyncStatusState);
