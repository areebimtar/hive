import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';

import FroalaHtmlInput from '../FroalaHtmlInput';
import { THROTTLE_TIMEOUT } from 'app/client/constants';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';

class SingleHtmlInputForm extends Component {
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

  onChange(event) {
    this.props.fields.value.onChange(event);
    this.sendUpdate();
  }

  onSubmit() {
    this.props.resetForm();
    this.props.onApply();
  }

  render() {
    const { handleSubmit, submitting, invalid, fields: {value} } = this.props;
    const inactive = value.pristine || submitting || invalid;
    const applyButtonClasses = classNames({apply: true, inactive: inactive});

    return (
      <form onSubmit={handleSubmit(this.onSubmit.bind(this))} >
        <div className="input-wrapper">
          { !submitting && <FroalaHtmlInput {...filterInputFieldProps(value)} onChange={this.onChange.bind(this)} maxHeight={172} /> }
        </div>
        { <button type="submit" className={applyButtonClasses} onClick={handleSubmit(this.onSubmit.bind(this))} disabled={inactive}>Apply</button> }
      </form>
    );
  }

  sendUpdate = _.throttle(() => this.props.onUpdate(this.props.fields.value.value), THROTTLE_TIMEOUT, {leading: false});
}

export default connect()(
  reduxForm({
    form: 'singleInput',
    fields: ['value'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(SingleHtmlInputForm));
