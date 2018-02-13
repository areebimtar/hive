import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { validateInput } from 'global/modules/etsy/bulkEditOps/validate/quantityInventory';

import SingleInputForm from '../SingleInputForm';


export class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  }

  getForm = (type) => {
    switch (type) {
      case BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_INCREASE_BY:
      case BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_DECREASE_BY:
      case BULK_EDIT_OP_CONSTS.QUANTITY_INVENTORY_CHANGE_TO:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Quantity" validate={validateInput}/>);
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
