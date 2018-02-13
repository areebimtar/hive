import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { reduxForm } from 'redux-form';

import classNames from 'classnames';
import _ from 'lodash';

import { filterInputFieldProps } from '../../../../shared/modules/utils/reduxForm';

class RequestResetForm extends Component {
  static propTypes = {
    onApply: PropTypes.func,
    disabled: PropTypes.bool,
    // form props
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired
  };

  onSubmit = (submitInfo) => this.props.resetForm() && this.props.onApply(submitInfo)

  render() {
    const { disabled, fields: {email}, handleSubmit } = this.props;
    const buttonDisabled = disabled || _.isEmpty(email.value);
    const classes = classNames({ inactive: !!buttonDisabled });

    return (
      <form onSubmit={handleSubmit(this.onSubmit)}>
        <div>
          <label>Email</label>
          <input type="text" placeholder="Email" {...filterInputFieldProps(email)} disabled={!!disabled}/>
        </div>
        <button className={classes} onClick={handleSubmit(this.onSubmit)} disabled={!!buttonDisabled}>Send Reset Link</button>
      </form>
    );
  }
}

export default reduxForm({
  form: 'RequestResetForm',
  fields: ['email'],
  getFormState: (state, reduxMountPoint) => {
    const val = state.getIn(['combined', reduxMountPoint]);
    return (val && val.toJS) ? val.toJS() : {};
  }
})(RequestResetForm);
