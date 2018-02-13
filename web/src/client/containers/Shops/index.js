import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as CONSTANTS from 'app/client/constants';
import * as components from '../../components';
import Intercom from '../../components/Intercom';
import classNames from 'classnames';
import * as boolString from 'global/modules/utils/boolString';
import { CHANNEL_NAMES } from 'global/constants';

const { Header } = components;
const { ApplyProgressModal } = components.BulkEdit;

class Shops extends Component {
  static propTypes = {
    user: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
    children: PropTypes.object.isRequired,
    intercomProfile: PropTypes.object,
    magicOptions: PropTypes.array.isRequired,
    applyProgressModal: PropTypes.object.isRequired,
    channelName: PropTypes.string.isRequired,
    location: PropTypes.object.isRequired
  }

  onWelcomePage() {
    // FIXME: ugly hack, current routes structure doesn't allow finer control over Header component and/or passing
    // parameter to route component from router setup. we need to set different css on welcome pages
    const url = _.get(this, 'props.location.pathname', '');
    return url.indexOf('/welcome') !== -1;
  }

  render() {
    const { children, user, magicOptions, applyProgressModal, channelName, location } = this.props;
    const classes = classNames(_.map(magicOptions, (item) => `enable-${_.kebabCase(item.key)}`), {'no-shops': this.onWelcomePage() });
    const intercomProfile = this.props.intercomProfile;
    return (
      <div className={classes}>
        <Intercom user={intercomProfile} />
        <Header params={user} location={location}/>
        { children && React.cloneElement(children, {user}) }

        <ApplyProgressModal
          open={applyProgressModal.shown}
          channelName={channelName}
          progress={applyProgressModal.progress}
          total={applyProgressModal.total} />
      </div>
    );
  }
}

export default connect((state) => {
  const enabledMagicFeatures = _.filter(CONSTANTS.MAGIC_SETTINGS, (magicSetting) => {
    return magicSetting.enableUi && boolString.isTrue(state.getIn(['userProfile', magicSetting.key]));
  });

  return {
    magicOptions: enabledMagicFeatures,
    user: state.getIn(['auth', 'user']),
    intercomProfile: state.get('intercom'),
    applyProgressModal: state.getIn(['edit', 'applyProgressModal']).toJS(),
    channelName: _.capitalize(CHANNEL_NAMES[state.getIn(['edit', 'channelId'])])
  };
})(Shops);
