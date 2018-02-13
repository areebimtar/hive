import Promise from 'bluebird';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';
import _ from 'lodash';
import * as Actions from '../actions';
import * as CONSTANTS from '../constants';

import validate from '../../shared/createAccountValidation';
import { filterInputFieldProps } from '../../../../shared/modules/utils/reduxForm';

class CreateAccountForm extends Component {
  static propTypes = {
    disabled: PropTypes.bool,
    dispatch: PropTypes.func.isRequired,
    // form props
    validate: PropTypes.func,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  }

  componentWillMount() {
    this.props.dispatch(Actions.Login.setState(CONSTANTS.CREATE_ACCOUNT));
  }

  componentDidMount() {
    setTimeout(() => {
      this.refs.firstname.focus();
    }, 500);
  }

  onSubmit = (submitInfo) => {
    const validation = validate(submitInfo);
    if (_.isEmpty(validation)) {
      this.props.resetForm();
      this.props.dispatch(Actions.Login.createAccount(submitInfo));
      return Promise.resolve();
    } else {
      return Promise.reject(validation);
    }
  }

  render() {
    const notEmpty = field => !_.isEmpty(field.value);
    const { disabled, fields: {firstname, lastname, email, password, password2}, handleSubmit } = this.props;
    const formFilled = notEmpty(lastname) && notEmpty(firstname) && notEmpty(email) && notEmpty(password) && notEmpty(password2);
    const buttonDisabled = disabled || !formFilled;
    const classes = classNames({ inactive: !!buttonDisabled });

    return (
      <div>
        <form ref="form" onSubmit={handleSubmit(this.onSubmit)}>
          <div className="form-username-field">
            <label>First Name</label>
            <input ref="firstname" type="text" placeholder="First Name" {...filterInputFieldProps(firstname)} disabled={!!disabled}/>
          </div>
          <div className="form-username-field">
            <label>Last Name</label>
            <input ref="lastname" type="text" placeholder="Last Name" {...filterInputFieldProps(lastname)} disabled={!!disabled}/>
          </div>
          <div className="form-username-field">
            <label>Email</label>
            <input ref="email" type="text" placeholder="Email" {...filterInputFieldProps(email)} disabled={!!disabled}/>
          </div>
          <div className="form-password-field">
            <label>Password</label>
            <input ref="password" type="password" placeholder="Password" {...filterInputFieldProps(password)} disabled={!!disabled}/>
          </div>
          <div className="form-password-field">
            <label>Repeat password</label>
            <input ref="password2" type="password" placeholder="Confirm Password" {...filterInputFieldProps(password2)} disabled={!!disabled} />
          </div>
          <button className={classes} onClick={handleSubmit(this.onSubmit)} disabled={!!buttonDisabled}>Create Account</button>
          <div className="error">{firstname.error}</div>
          <div className="error">{lastname.error}</div>
          <div className="error">{email.error}</div>
          <div className="error">{password.error}</div>
        </form>
      </div>
    );
  }
}

export default reduxForm({
  form: 'createAccount',
  fields: ['firstname', 'lastname', 'email', 'password', 'password2'],
  getFormState: (state, reduxMountPoint) => {
    const val = state.getIn(['combined', reduxMountPoint]);
    return (val && val.toJS) ? val.toJS() : {};
  }
})(CreateAccountForm);
