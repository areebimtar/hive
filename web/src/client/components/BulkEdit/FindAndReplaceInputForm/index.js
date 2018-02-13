import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';

import { THROTTLE_TIMEOUT } from 'app/client/constants';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';

export class FindAndReplaceInputForm extends Component {
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

    return (
      <div className="bulk-edit--find-replace">
        <form onSubmit={handleSubmit(this.onSubmit)}>
          <div className="bulk-edit--find">
            { !submitting && <input type="text" placeholder="Find" {...filterInputFieldProps(find)} onChange={this.onChangeFind} /> }
            { !find.pristine && <div className="error toolip top">{find.error}</div> }
          </div>
          <div className="bulk-edit--replace">
            { !submitting && <input type="text" placeholder="Replace" {...filterInputFieldProps(replace)} onChange={this.onChangeReplace} /> }
            { !replace.pristine && <div className="error tooltip top">{replace.error}</div> }
          </div>
          { <button type="submit" className={applyButtonClasses} onClick={handleSubmit(this.onSubmit)} disabled={inactive}>Apply</button> }
        </form>
      </div>
    );
  }

  sendUpdate = _.throttle(() => this.props.onUpdate({find: this.props.fields.find.value, replace: this.props.fields.replace.value}), THROTTLE_TIMEOUT, {leading: false});
}

export default connect()(
  reduxForm({
    form: 'findAndReplace',
    fields: ['find', 'replace'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(FindAndReplaceInputForm));
