import _ from 'lodash';
import { List } from 'immutable';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import SimpleDropdown from '../DropdownListComponentWithAdd/SimpleDropdown';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/shopify/bulkOpsConstants';
import { FIELDS } from 'global/modules/shopify/constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';


const getOpData = (product) => {
  return {
    type: BULK_EDIT_OP_CONSTS.VENDOR_SET,
    products: [product.get('id')]
  };
};

export class ProductRowVendor extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    vendors: PropTypes.array.isRequired
  }

  onClick = (event) => {
    event.stopPropagation();
    const product = this.props.product;
    this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product)));
  }

  onChange = (vendor) => this.props.dispatch(vendor ? Actions.BulkEdit.setInlineEditOpValueAndApply(vendor) : Actions.BulkEdit.cancelInlineEditOp());

  getDropdownData(vendors, value) {
    return [{id: 'None', value: 'None'}].concat(_.map(vendors, vendor =>
      ({id: vendor, value: vendor, class: classNames({ selected: vendor === value })})));
  }

  render() {
    const { product, vendors } = this.props;

    const formattedVendor = product.get('_formattedVendor');
    const inlinedVendor = product.getIn(['_inInlineEditing', 'value']);
    const formated = !!formattedVendor || !!inlinedVendor;
    const vendor =  inlinedVendor || formattedVendor && formattedVendor.get('new') || product.get(FIELDS.VENDOR);
    const dropdownData = this.getDropdownData(vendors, vendor);

    const name = vendor || 'None';

    const statusData = product.getIn(['_status', 'data']);
    const classes = classNames('bulk-edit-dropdown-parent', {preview: formated});

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
          <span className="message">{statusData}</span>
          <div className="bulk-edit--properties">
            <div className="bulk-edit-dropdown-item">
              <span className="vendor" onClick={this.onClick}>
                <div className={classes}>{name}</div>
              </span>
              { product.get('_inInlineEditing') && <SimpleDropdown options={dropdownData} selected={vendor} onChange={this.onChange}/> }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(state => ({
  vendors: state.getIn(['edit', 'vendors'], new List()).toJS()
}))(ProductRowVendor);
