import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { validateInput } from 'global/modules/etsy/bulkEditOps/validate/skuInventory';

import SingleInputForm from '../SingleInputForm';
import FindAndReplaceForm from '../FindAndReplaceInputForm';

export class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  }

  getForm = (type) => {
    switch (type) {
      case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_BEFORE:
      case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_ADD_AFTER:
      case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO:
      case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_DELETE:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="SKU" validate={validateInput}/>);
      case BULK_EDIT_OP_CONSTS.SKU_INVENTORY_FIND_AND_REPLACE:
        return (<FindAndReplaceForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} validate={validateInput} />);
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
