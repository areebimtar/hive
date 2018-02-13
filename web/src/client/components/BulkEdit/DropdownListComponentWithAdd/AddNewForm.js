import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import classNames from 'classnames';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';


class AddNewForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    // form props
    validate: PropTypes.func,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    invalid: PropTypes.bool.isRequired
  }

  onSubmit = () => !this.props.onApply(this.props.fields.value.value) && this.props.resetForm()
  onKeyDown = (event) => {
    // we need to stop event as dropdown is handling key events as well
    event.stopPropagation();
    // on enter key, we need to submit data
    if (event.keyCode === 13) {
      this.props.handleSubmit(this.onSubmit);
    }
  }

  render() {
    const { placeholder, handleSubmit, submitting, invalid, fields: {value} } = this.props;
    const inactive = value.pristine || submitting || invalid;
    const addButtonClasses = classNames({'add-button': true, inactive: inactive});

    return (
      <form onSubmit={handleSubmit(this.onSubmit)} >
        <div className="add-new" onClick={(event) => event.stopPropagation()}>
          { !submitting && <input type="text" placeholder={placeholder} {...filterInputFieldProps(value)} onKeyDown={this.onKeyDown}/> }
          { !value.pristine && value.error && <div className="error tooltip right">{value.error}</div> }
          <button type="submit" className={addButtonClasses} onClick={handleSubmit(this.onSubmit)} disabled={inactive}>Add</button>
        </div>
      </form>
    );
  }
}

export default connect()(
  reduxForm({
    form: 'addNewForm',
    fields: ['value'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(AddNewForm));
