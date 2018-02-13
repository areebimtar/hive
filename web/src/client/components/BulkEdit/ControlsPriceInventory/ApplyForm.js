import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { validateInput, validateChangeToInput } from 'global/modules/etsy/bulkEditOps/validate/priceInventory';

import PriceForm from './PriceForm';
import PriceChangeToForm from './PriceChangeToForm';


class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  };

  getForm(type) {
    switch (type) {
      case BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_INCREASE_BY:
      case BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_DECREASE_BY:
        const initialValues = {
          type: 'absolute',
          value: '',
          rounding: ''
        };
        return (<PriceForm key={type} initialValues={initialValues} onApply={this.props.onApply} onUpdate={this.props.onUpdate} validate={validateInput}/>);
      case BULK_EDIT_OP_CONSTS.PRICE_INVENTORY_CHANGE_TO:
        return (<PriceChangeToForm key={type} onApply={this.props.onApply} onUpdate={this.props.onUpdate} validate={validateChangeToInput}/>);
      default:
        throw new Error(`There is no handler for ${type}`);    }
  }

  render() {
    const { type } = this.props;

    return (<div>{ this.getForm(type) }</div>);
  }
}

export default connect()(ApplyForm);
