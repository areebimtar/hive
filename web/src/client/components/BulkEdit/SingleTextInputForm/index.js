import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';
import Textarea from 'react-textarea-autosize';

import { THROTTLE_TIMEOUT } from 'app/client/constants';
import { filterInputFieldProps } from 'global/modules/utils/reduxForm';


class SingleTextInputForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    // form props
    validate: PropTypes.func,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  }

  onChange = (event) => this.props.fields.value.onChange(event) && this.sendUpdate()
  onSubmit = () => this.props.resetForm() && this.props.onApply()

  render() {
    const { placeholder, handleSubmit, submitting, invalid, fields: {value} } = this.props;
    const inactive = value.pristine || submitting || invalid;
    const applyButtonClasses = classNames({apply: true, inactive: inactive});
    // ugly hack for React, if value is set to null/undefined,
    // textarea becomes uncontrolled and React will not update textarea'a value (henco old one will remain)
    value.value = value.value || '';

    return (
      <form onSubmit={handleSubmit(this.onSubmit)} >
        { !submitting && <Textarea key={typeof value.value === undefined} type="text" minRows={3} maxRows={10} placeholder={placeholder} {...filterInputFieldProps(value)} onChange={this.onChange}/> }
        { !value.pristine && <div className="error">{value.error}</div> }
        { <button type="submit" className={applyButtonClasses} onClick={handleSubmit(this.onSubmit)} disabled={inactive}>Apply</button> }
      </form>
    );
  }

  sendUpdate = _.throttle(() => {
    this.props.onUpdate(this.props.fields.value.value);
  }, THROTTLE_TIMEOUT, {leading: false})
}

export default connect()(
  reduxForm({
    form: 'singleTextInput',
    fields: ['value'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(SingleTextInputForm));
