import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../../actions';

import TaxonomyInlineEdit from './TaxonomyInlineEdit';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

const getOpData = (product, taxonomy) => {
  return {
    type: BULK_EDIT_OP_CONSTS.TAXONOMY_SET,
    products: [product.get('id')],
    taxonomy
  };
};

export class ProductRowTaxonomy extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired
  }

  onClick = (product, taxonomy) => this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product, taxonomy)))
  onChange = (taxonomy) => this.props.dispatch(taxonomy ? Actions.BulkEdit.setInlineEditOpValueAndApply(taxonomy.toString()) : Actions.BulkEdit.cancelInlineEditOp());

  render() {
    const { product } = this.props;

    const formatedTaxonomy = product.get('_formattedTaxonomyId');
    const inlinedTaxonomyId = product.getIn(['_inInlineEditing', 'value']);
    const taxonomyId =  inlinedTaxonomyId || formatedTaxonomy && formatedTaxonomy.get('new') || product.get(FIELDS.TAXONOMY_ID);
    const status = product.getIn(['_status', 'data'], null);

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
          <div className="bulk-edit--properties">
            <span className="taxonomy" onClick={(event) => event.stopPropagation()}>
              <TaxonomyInlineEdit
                id={taxonomyId}
                edited={product.getIn(['_inInlineEditing', 'taxonomy'])}
                onChange={this.onChange}
                onClick={(taxonomy) => this.onClick(product, taxonomy)}
                preview={!!formatedTaxonomy}
                status={status}/>
            </span>
          </div>
        </div>
      </div>);
  }
}

export default connect()(ProductRowTaxonomy);
