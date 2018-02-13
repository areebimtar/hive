import React, { Component } from 'react';
import PropTypes from 'prop-types';

import ReactIntercom from 'react-intercom';

export default class Intercom extends Component {
  static propTypes = {
    user: PropTypes.shape({
      userHash: PropTypes.string,
      userId: PropTypes.number,
      userName: PropTypes.string
    })
  };

  render() {
    const appID = process.env.HIVE_INTERCOM_APP_ID;
    const user = {
      user_id: this.props.user.userId,
      user_hash: this.props.user.userHash,
      email: this.props.user.userName
    };

    if (appID && this.props.user) {
      return (
        <ReactIntercom appID={appID} {...user}  />
      );
    } else {
      return null;
    }
  }
}
