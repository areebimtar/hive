import React  from 'react';
import classNames from 'classnames';

const msgFormater = value => {
  if (!value) { return 'Syncing ...'; }
  if (value === 1) { return 'Syncing 1 update'; }
  return `Syncing ${value} updates`;
};

// eslint-disable-next-line react/prop-types
const SyncStatusView = ({ showSyncStatus, showModal, remainingCount, onDismissModal, channelName }) => {
  const msg = msgFormater(remainingCount);

  const classes = classNames({
    'sync-status': true,
    rotating: true,
    hidden: ! showSyncStatus,
    'show-popup': showModal,
    suppressed: ! showModal
  });

  return (
    <div className={classes}>
      { showSyncStatus && <span className="text">{ msg }</span> }
      <div className="sync-info-overlay" />
      <div className="sync-info-popup">
        <div className="sync-image vela-font" />
        <div className="primary-text">Sending to {channelName}</div>
        <div className="secondary-text">Synced updates will first appear in {channelName}'s Listings Manager</div>
        <button className="apply" onClick={onDismissModal}>Got It!</button>
      </div>
    </div>
  );
};

export default SyncStatusView;
