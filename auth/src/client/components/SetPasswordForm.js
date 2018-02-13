import Promise from 'bluebird';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { reduxForm } from 'redux-form';
import _ from 'lodash';

import classNames from 'classnames';
import { MINIMUM_PASSWORD_LENGTH } from '../../shared/constants';
import { filterInputFieldProps } from '../../../../shared/modules/utils/reduxForm';


const validate = values => {
  const errors = {};

  if (values.password !== values.password2) {
    errors.password = 'Passwords do not match.';
  }

  if (!values.password) {
    errors.password = 'Password cannot be empty.';
  }

  if (values.password && values.password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long.`;
  }

  return errors;
};

class SetPasswordForm extends Component {
  static propTypes = {
    onApply: PropTypes.func,
    disabled: PropTypes.bool,
    // form props
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired
  };

  onSubmit = (submitInfo) => {
    const validation = validate(submitInfo);
    if (_.isEmpty(validation)) {
      this.props.resetForm();
      this.props.onApply(submitInfo);
      return Promise.resolve();
    } else {
      return Promise.reject(validation);
    }
  };

  render() {
    const { disabled, fields: {password, password2}, handleSubmit } = this.props;
    const buttonDisabled = disabled || (_.isEmpty(password.value) || _.isEmpty(password2.value));
    const classes = classNames({ inactive: !!buttonDisabled });

    return (
      <form onSubmit={handleSubmit(this.onSubmit)}>
        <div>
          <label>Password</label>
          <input type="password" placeholder="Password" {...filterInputFieldProps(password)} disabled={!!disabled}/>
        </div>
        <div>
          <label>Retype password</label>
          <input type="password" placeholder="Confirm Password" {...filterInputFieldProps(password2)} disabled={!!disabled}/>
        </div>
        <button className={classes} onClick={handleSubmit(this.onSubmit)} disabled={!!buttonDisabled}>Reset Password</button>
        <div className="error">{password.error}</div>
      </form>
    );
  }
}

export default reduxForm({
  form: 'SetPasswordForm',
  fields: ['password', 'password2'],
  getFormState: (state, reduxMountPoint) => {
    const val = state.getIn(['combined', reduxMountPoint]);
    return (val && val.toJS) ? val.toJS() : {};
  }
})(SetPasswordForm);
