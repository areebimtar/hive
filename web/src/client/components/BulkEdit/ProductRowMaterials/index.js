import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../../actions';
import Materials from './Materials';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

const getOpData = (product, material) => {
  return {
    type: BULK_EDIT_OP_CONSTS.MATERIALS_DELETE,
    products: [product.get('id')],
    value: material
  };
};

export class ProductRowTags extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired
  }

  render() {
    const { product } = this.props;
    const materials = product.get('materials');
    const _formattedMaterials = product.get('_formattedMaterials');
    const statusData = product.getIn(['_status', 'data']);

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
          <Materials materials={_formattedMaterials || materials} onRemoveTag={this.removeTag}/>
          <span className="message">{statusData}</span>
        </div>
      </div>);
  }

  removeTag = (material) => this.props.dispatch(Actions.BulkEdit.addOp(getOpData(this.props.product, material)))
}

export default connect()(ProductRowTags);
