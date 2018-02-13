import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { DropdownList } from 'react-widgets';

import * as Actions from '../../../actions';
import { PRICE_INVENTORY_OPTIONS } from 'app/client/constants/bulkEdit';
import ApplyForm from './ApplyForm';


class ControlsPriceInventory extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object
  }

  render() {
    const { data } = this.props;
    const type = data.get('type');

    return (
      <div className="bulk-edit--actions bulk-edit--price">
        <div className="bulk-edit--actionselector">
          <DropdownList data={PRICE_INVENTORY_OPTIONS}
                        valueField="type" textField="text"
                        defaultValue={type || 'Choose Action'}
                        value={type}
                        onChange={this.setOperation.bind(this)} />
        </div>
        <div className="bulk-edit--actionform">
          <ApplyForm ref="form" type={type} onApply={this.applyOp.bind(this)} onUpdate={this.setValue.bind(this)} />
        </div>
      </div>
    );
  }

  setValue(value) {
    this.props.dispatch(Actions.BulkEdit.setValue([{ index: null, combination: null, value }]));
  }
  setOperation(operation) {
    this.props.dispatch(Actions.BulkEdit.setOperation(operation.type));
    this.props.dispatch(Actions.BulkEdit.resetForm('priceInput'));
  }
  applyOp() {
    this.props.dispatch(Actions.BulkEdit.applyPreviewOp());
  }
}

export default connect()(ControlsPriceInventory);
