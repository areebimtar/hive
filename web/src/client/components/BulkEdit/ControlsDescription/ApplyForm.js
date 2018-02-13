import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

import { validateInput } from 'global/modules/etsy/bulkEditOps/validate/description';

import SingleTextInputForm from '../SingleTextInputForm';
import FindAndReplaceTextInputForm from '../FindAndReplaceTextInputForm';


export class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  };

  getForm(type) {
    switch (type) { // eslint-disable-line default-case
      case BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER:
      case BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_BEFORE:
      case BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE:
        return (<SingleTextInputForm key={type} onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Description" validate={validateInput} />);
      case BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE:
        return (<FindAndReplaceTextInputForm key={type} onApply={this.props.onApply} onUpdate={this.props.onUpdate}  />);
      default:
        throw new Error(`There is no handler for ${type}`);
    }
  }

  render() {
    const { type } = this.props;

    return (<div>{ this.getForm(type) }</div>);
  }
}

export default connect()(ApplyForm);
