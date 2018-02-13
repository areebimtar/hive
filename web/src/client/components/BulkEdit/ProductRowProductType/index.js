import _ from 'lodash';
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
    type: BULK_EDIT_OP_CONSTS.PRODUCT_TYPE_SET,
    products: [product.get('id')]
  };
};

export class ProductRowProductType extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    productTypes: PropTypes.array
  }

  onClick = (event) => {
    event.stopPropagation();
    const product = this.props.product;
    this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product)));
  }

  onChange = (productType) => this.props.dispatch(productType ? Actions.BulkEdit.setInlineEditOpValueAndApply(productType) : Actions.BulkEdit.cancelInlineEditOp());

  getDropdownData(productTypes, value) {
    return [{id: 'None', value: 'None'}].concat(_.map(productTypes, productType =>
      ({id: productType, value: productType, class: classNames({ selected: productType === value })})));
  }

  render() {
    const { product, productTypes } = this.props;

    const formattedProductType = product.get('_formattedProductType');
    const inlinedProductType = product.getIn(['_inInlineEditing', 'value']);
    const formated = !!formattedProductType || !!inlinedProductType;
    const productType =  inlinedProductType || formattedProductType && formattedProductType.get('new') || product.get(FIELDS.PRODUCT_TYPE);
    const dropdownData = this.getDropdownData(productTypes, productType);

    const name = productType || 'None';

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
              <span className="productType" onClick={this.onClick}>
                <div className={classes}>{name}</div>
              </span>
              { product.get('_inInlineEditing') && <SimpleDropdown options={dropdownData} selected={productType} onChange={this.onChange}/> }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(state => ({
  productTypes: state.getIn(['edit', 'productTypes']).toJS()
}))(ProductRowProductType);
