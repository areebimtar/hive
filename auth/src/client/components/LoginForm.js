import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { reduxForm } from 'redux-form';
import { Link } from 'react-router';

import classNames from 'classnames';
import _ from 'lodash';

import * as Actions from '../actions';
import * as CONSTANTS from '../constants';

import AutofillCheck from './AutofillCheck';

import { filterInputFieldProps } from '../../../../shared/modules/utils/reduxForm';

class LoginForm extends Component {
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
    this.props.dispatch(Actions.Login.setState(CONSTANTS.SIGN_IN));
  }

  componentDidMount() {
    setTimeout(() => {
      this.refs.email.focus();
    }, 500);
  }

  onSubmit = (loginInfo) => this.props.resetForm() && this.props.dispatch(Actions.Login.submit(loginInfo))
  onAutofill = () => this.setState({ hasAutofillValues: true })


  render() {
    const { disabled, fields: {username, password}, handleSubmit } = this.props;
    const hasCredentialsValues = !_.isEmpty(username.value) && !_.isEmpty(password.value);
    const isAutofilled = !username.touched && !password.touched && this.state.hasAutofillValues;
    const buttonDisabled = disabled || (!hasCredentialsValues && !isAutofilled);
    const classes = classNames({ inactive: !!buttonDisabled });

    return (
      <form ref="form" onSubmit={handleSubmit(this.onSubmit)}>
        <AutofillCheck onAutofill={this.onAutofill}>
          <div className="form-username-field">
            <label>Username</label>
            <input ref="email" type="text" placeholder="Email" {...filterInputFieldProps(username)} disabled={!!disabled}/>
          </div>
          <div className="form-password-field">
            <label>Password</label>
            <input ref="password" type="password" placeholder="Password" {...filterInputFieldProps(password)} disabled={!!disabled}/>
            <Link to={'/resetPassword'} className="reset-password">Forgot?</Link>
          </div>
          <button className={classes} onClick={handleSubmit(this.onSubmit)} disabled={!!buttonDisabled}>Sign In</button>
        </AutofillCheck>
      </form>
    );
  }

  state = {}
}

export default reduxForm({
  form: 'loginForm',
  fields: ['username', 'password'],
  getFormState: (state, reduxMountPoint) => {
    const val = state.getIn(['combined', reduxMountPoint]);
    return (val && val.toJS) ? val.toJS() : {};
  }
})(LoginForm);
