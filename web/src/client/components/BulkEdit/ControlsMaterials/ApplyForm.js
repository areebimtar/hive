import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

import { validateInput } from 'global/modules/etsy/bulkEditOps/validate/materials';

import SingleInputForm from '../SingleInputForm';


export class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  };

  getForm = (type) => {
    switch (type) { // eslint-disable-line default-case
      case BULK_EDIT_OP_CONSTS.MATERIALS_ADD:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Materials (Separate multiple materials with commas)" validate={validateInput} />);
      case BULK_EDIT_OP_CONSTS.MATERIALS_DELETE:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Materials (Separate multiple materials with commas)"/>);
      default:
        throw new Error(`There is no handler for ${type}`);
    }
  };

  render() {
    const { type } = this.props;

    return (<div>{ this.getForm(type) }</div>);
  }
}

export default connect()(ApplyForm);
