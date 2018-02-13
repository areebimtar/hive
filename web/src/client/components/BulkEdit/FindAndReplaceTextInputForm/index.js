import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';
import Textarea from 'react-textarea-autosize';

import { THROTTLE_TIMEOUT } from 'app/client/constants';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';

export class FindAndReplaceTextInputForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    // form props
    validate: PropTypes.func,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  }

  onChangeFind = (event) => this.props.fields.find.onChange(event) && this.sendUpdate()
  onChangeReplace = (event) => this.props.fields.replace.onChange(event) && this.sendUpdate()
  onSubmit = () => this.props.resetForm() && this.props.onApply()

  render() {
    const { handleSubmit, submitting, invalid, fields: {find, replace} } = this.props;
    const inactive = find.pristine || replace.pristine || submitting || invalid;
    const applyButtonClasses = classNames({apply: true, inactive: inactive});
    // ugly hack for React, if value is set to null/undefined,
    // textarea becomes uncontrolled and React will not update textarea'a value (henco old one will remain)
    find.value = find.value || '';
    replace.value = replace.value || '';

    return (
      <div className="bulk-edit--find-replace">
        <form onSubmit={handleSubmit(this.onSubmit)}>
          { !submitting && <Textarea type="text" placeholder="Find"
            minRows={3} maxRows={5} {...filterInputFieldProps(find)} onChange={this.onChangeFind} /> }
          { !find.pristine && <div className="error">{find.error}</div> }
          { !submitting && <Textarea className="bulk-edit--replace" type="text" placeholder="Replace"
            minRows={3} maxRows={5} {...filterInputFieldProps(replace)} onChange={this.onChangeReplace} /> }
          { !replace.pristine && <div className="error">{replace.error}</div> }

          { <button type="submit" className={applyButtonClasses} onClick={handleSubmit(this.onSubmit)} disabled={inactive}>Apply</button> }
        </form>
      </div>
    );
  }

  sendUpdate = _.throttle(() => {
    this.props.onUpdate({find: this.props.fields.find.value, replace: this.props.fields.replace.value});
  }, THROTTLE_TIMEOUT, {leading: false})
}

export default connect()(
  reduxForm({
    form: 'findAndReplace',
    fields: ['find', 'replace'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(FindAndReplaceTextInputForm));
