import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../actions';
import ContactLink from './ContactLink';
import RequestResetForm from './RequestResetForm';

@connect(reduction => ({
  inProgress: reduction.getIn(['resetPassword', 'inProgress']),
  msgSent: reduction.getIn(['resetPassword', 'msgSuccessfullySent']),
  errorMsg: reduction.getIn(['resetPassword', 'errorMsg'])
}), Actions.ResetPassword)
export default class ResetPasswordPage extends Component {
  static propTypes = {
    requestReset: PropTypes.func.isRequired, // via 2nd param to @connect
    inProgress: PropTypes.bool,
    msgSent: PropTypes.bool,
    errorMsg: PropTypes.string
  };

  // page shown when request successfully processed
  renderInfoPage() {
    return (
      <p>
        Thanks! An email with a reset link should arrive in your inbox shortly.
        If it does not, please check your spam folder or <ContactLink text="contact us"/>.
      </p>
    );
  }

  renderForm() {
    const { errorMsg, inProgress, requestReset } = this.props;
    return (
      <div>
        <p>
          Enter your email and we&apos;ll send you a link to reset your password
        </p>
        <RequestResetForm onApply={requestReset} disabled={inProgress}/>
        { errorMsg && <p className="error description">
        We could not send an email to given address.
        Please check your entry and try again later or contact us directly at
        </p> }
      </div>
    );
  }

  render() {
    const { msgSent } = this.props;
    const content = msgSent ? this.renderInfoPage() : this.renderForm();

    return (
      <div className="reset-password-form">
        <h1>Reset Password</h1>
        { content }
      </div>
    );
  }
}
