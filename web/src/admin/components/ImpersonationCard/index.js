import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ImpersonationCard extends Component {
  static propTypes = {
    imporsonatedUserEmail: PropTypes.string.isRequired,
    stopImpersonating: PropTypes.func.isRequired
  }

  render() {
    const { imporsonatedUserEmail, stopImpersonating } = this.props;
    return (
      <div className="card amber lighten-5">
        <div className="card-content">
          <span className="card-title">Impersonation</span>
          <p>
            You are impersonating a user <b>{imporsonatedUserEmail}</b> . Open <a href={window.location.origin}>Vela</a> in order to see user's account.
          </p>
        </div>
        <div className="card-action">
          <a className="clickable"
            onClick={stopImpersonating}>
            Stop impersonating
          </a>
        </div>
      </div>
    );
  }
}

export default ImpersonationCard;
