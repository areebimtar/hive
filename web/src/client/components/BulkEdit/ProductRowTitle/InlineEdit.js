import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import enhanceWithClickOutside from '../../ClickOutside';

import { filterInputFieldProps } from 'global/modules/utils/reduxForm';


export class InlineEdit extends Component {
  static propTypes = {
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    // form props
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired
  }

  onChange = (event) => this.props.onUpdate(event.target.value) && this.props.fields.value.onChange(event)
  onSubmit = () => this.props.resetForm() && this.props.onApply()

  render() {
    const { handleSubmit, fields: {value} } = this.props;

    return (
      <div className="title-inline-edit">
        <form onSubmit={handleSubmit(this.onSubmit)} >
          <input type="text" placeholder="Title" {...filterInputFieldProps(value)} onChange={this.onChange} onClick={event => event.stopPropagation()}/>
        </form>
      </div>
    );
  }

  handleClickOutside = () => this.onSubmit()
}

export default connect()(
  reduxForm({
    form: 'titleInlineEditOp',
    fields: ['value'],
    getFormState: (state, reduxMountPoint) => {
      const val = state.getIn(['combined', reduxMountPoint]);
      return (val && val.toJS) ? val.toJS() : {};
    }
  })(
    enhanceWithClickOutside(
      InlineEdit
    )
  )
);
