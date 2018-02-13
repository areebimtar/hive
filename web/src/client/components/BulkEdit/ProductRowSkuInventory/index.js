import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { List as ListImm } from 'immutable';

import * as Actions from '../../../actions';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';
import { CANNOT_EDIT_INVENTORY_MESSAGE } from '../../../constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

import List from '../ControlsInventory/List';
import CannotEdit from '../CannotEdit';

const getOpData = (product, meta) => {
  return {
    type: BULK_EDIT_OP_CONSTS.SKU_INVENTORY_CHANGE_TO,
    products: [product.get('id')],
    meta
  };
};

export class ProductRowSkuInventory extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired
  }

  onChange = (value) => this.props.dispatch(Actions.BulkEdit.appendInlineEditOpValue(value))
  onFinishEdit = () => this.props.dispatch(Actions.BulkEdit.applyInlineEditOp())
  onClick = (index) => {
    const { product } = this.props;
    const inBulkPreview = product.get('_inBulkPreview', false) && !product.get('_unapplied', false);
    const inInlineEditing = !!product.get('_inInlineEditing', false);

    if (!inInlineEditing && !inBulkPreview) {
      this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product, { autofocusIndex: index })));
    }
  }

  renderVariations(product) {
    const _inInlineEditing = !!product.get('_inInlineEditing', false);
    const _inBulkPreview = product.get('_inBulkPreview', false) && !product.get('_unapplied');
    const value = product.get('_formattedSkuInventory', new ListImm());
    const statusData = product.getIn(['_status', 'data']).toJS();
    const isGlobal = value.size === 1 && value.getIn([0, 'showValue'], false);
    const readOnly = !_inInlineEditing;
    const offeringListClasses = classNames('offering-list', 'product-row', 'sku-editor', { global: isGlobal, 'read-only': readOnly });
    const autofocusIndex = product.getIn(['_inInlineEditing', 'meta', 'autofocusIndex'], 0);

    return (
      <div className={offeringListClasses}>
        { statusData.status && <div className="global-status error">{statusData.status}</div> }
        <List
          columns={value}
          readOnly={readOnly}
          bulk={_inBulkPreview}
          inline={_inInlineEditing}
          autofocusIndex={autofocusIndex}
          onChange={this.onChange}
          onClick={this.onClick}
          onFinish={this.onFinishEdit} />
      </div>
    );
  }

  render() {
    const { product } = this.props;

    const canWriteInventory = !!product.get(FIELDS.CAN_WRITE_INVENTORY);

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
          { canWriteInventory && this.renderVariations(product) }
          { !canWriteInventory && <CannotEdit message={CANNOT_EDIT_INVENTORY_MESSAGE} /> }
        </div>
      </div>
    );
  }
}

export default connect()(ProductRowSkuInventory);
