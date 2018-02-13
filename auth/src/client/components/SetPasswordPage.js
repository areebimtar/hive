import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router';

import * as Actions from '../actions';
import SetPasswordForm from './SetPasswordForm';

@connect(reduction => ({
  inProgress: reduction.getIn(['resetPassword', 'inProgress']),
  msgSent: reduction.getIn(['resetPassword', 'msgSuccessfullySent']),
  errorMsg: reduction.getIn(['resetPassword', 'errorMsg'])
}))
export default class SetPasswordPage extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    inProgress: PropTypes.bool,
    msgSent: PropTypes.bool,
    errorMsg: PropTypes.string,
    params: PropTypes.shape({
      linkId: PropTypes.string.isRequired,
      linkData: PropTypes.string.isRequired
    })
  }

  renderInfoPage() {
    return (
      <p>
        Password successfully changed.<br />You can now <Link to={'/login'}>sign in</Link>.
      </p>
    );
  }

  renderForm() {
    const { errorMsg, inProgress } = this.props;
    return (
      <div>
        <p>
          Choose a new password and type it again to confirm.
        </p>
        <SetPasswordForm onApply={this.submitSetPasswordRequest} disabled={inProgress}/>
        { errorMsg && <p className="error">{errorMsg}</p> }
      </div>
    );
  }

  render() {
    const { msgSent } = this.props;
    const content = msgSent ? this.renderInfoPage() : this.renderForm();

    return (
      <div>
        <h1>New Password</h1>
        { content }
      </div>
    );
  }

  submitSetPasswordRequest = (submitInfo) => {
    const requestInfo = {...submitInfo, linkId: this.props.params.linkId, linkData: this.props.params.linkData};
    return this.props.dispatch(Actions.ResetPassword.performReset(requestInfo));
  };

}
