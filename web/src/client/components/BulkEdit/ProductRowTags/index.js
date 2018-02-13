import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../../actions';
import Tags from './Tags';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

const getOpData = (product, tag) => {
  return {
    type: BULK_EDIT_OP_CONSTS.TAGS_DELETE,
    products: [product.get('id')],
    value: tag
  };
};

export class ProductRowTags extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired
  }

  render() {
    const { product } = this.props;

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
          <Tags tags={product.get('_formattedTags') || product.get(FIELDS.TAGS) || []} onRemoveTag={this.removeTag}/>
          <span className="message">{product.getIn(['_status', 'data'])}</span>
        </div>
      </div>);
  }

  removeTag = (tag) => this.props.dispatch(Actions.BulkEdit.addOp(getOpData(this.props.product, tag)))
}

export default connect()(ProductRowTags);
