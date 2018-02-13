import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { CHANNEL_NAMES } from 'global/constants';

export class ControlsComingSoon extends Component {
  static propTypes = {
    channelName: PropTypes.string.isRequired
  }

  render() {
    const { channelName } = this.props;

    return (
      <div className="coming-soon-content">
        <div className="image" />
        <div className="title">Coming Soon</div>
        <div className="subtitle">We’re working hard to ensure that Vela is able to support
          <br/>the updates introduced by {channelName}’s new Shop Manager and will let you know
          <br/>once these sections become available.
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const channelName = _.capitalize(CHANNEL_NAMES[state.getIn(['edit', 'channelId'])]);
  return { channelName: channelName };
};

export default connect(mapStateToProps)(ControlsComingSoon);
