import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';
import { Map, List } from 'immutable';

import { getPropValue } from 'global/modules/etsy/utils';

import * as Actions from '../../../actions';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';
import { CANNOT_EDIT_INVENTORY_MESSAGE } from '../../../constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

import VariationsTabs from '../ControlsInventory/VariationsTabs';
import TaxonomyPreview from './TaxonomyPreview';
import CannotEdit from '../CannotEdit';

const getTaxonomyId = (product) =>
  getPropValue(product, 'taxonomyId', null) || getPropValue(product, 'taxonomy_id', null);

const getData = (product) => {
  return new Map({
    value: new Map({
      taxonomyId: getTaxonomyId(product),
      variations: product.get('variations', new Map()).toList(),
      offerings: product.get('productOfferings', new List())
    }),
    meta: product.get('_formattedVariationsInventory', null)
  });
};

const getOpData = (product, value, meta = null) => {
  const data = getData(product);

  const opData = new Map({
    type: BULK_EDIT_OP_CONSTS.VARIATIONS_INVENTORY_CHANGE_TO,
    products: new List([product.get('id')])
  })
  .set('value', data.get('value'))
  .set('meta', meta || data.get('meta'));

  return opData;
};

export class ProductRowInventory extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    context: PropTypes.object.isRequired
  }

  onSelectTab = (activeTab) => {
    const { product } = this.props;
    const _inInlineEditing = !!product.get('_inInlineEditing', false);
    if (!_inInlineEditing) {
      this.props.dispatch(Actions.BulkEdit.setInlineEditOpImm(getOpData(product, null, new Map({ activeTab }))));
      return;
    }
    this.props.dispatch(Actions.BulkEdit.setInlineEditOpMetadata(new Map({ activeTab })));
  }

  onChange = (newOpValue) => {
    const { product } = this.props;
    const _inInlineEditing = !!product.get('_inInlineEditing', false);
    if (!_inInlineEditing) {
      this.props.dispatch(Actions.BulkEdit.setInlineEditOpImm(getOpData(product, newOpValue.get('value'))));
    }
    this.props.dispatch(Actions.BulkEdit.setInventoryInlineEditOpValue(newOpValue.get('value')));
  }

  onFinish = () => {
    const { product } = this.props;
    const _inInlineEditing = !!product.get('_inInlineEditing', false);
    if (_inInlineEditing) {
      this.props.dispatch(Actions.BulkEdit.applyInlineEditOp());
    }
  }

  renderVariations(product) {
    const taxonomyId = parseInt(product.get('taxonomy_id'), 10);
    const inInlineEditing = !!product.get('_inInlineEditing', false);
    const inBulkPreview = product.get('_inBulkPreview', false) && !product.get('_unapplied');
    const previewOp = getOpData(product);

    const variations = product.has('variations') ? product.get('variations').toJS() : {};
    // do we need a dummy variation?
    if (_.keys(variations).length === 0) {
      variations['-1'] = {};
    }

    return (
      <variations-body>
        { !inBulkPreview && <TaxonomyPreview taxonomy={taxonomyId} /> }
        { !inBulkPreview &&
          <div className="bulk-edit--properties">
            <VariationsTabs
              variations={variations}
              op={previewOp}
              readOnly={false}
              onChange={this.onChange}
              onSelectTab={this.onSelectTab}
              onFinish={this.onFinish}
              bulk={false}
              inline={inInlineEditing}
              />
          </div>
        }
        { inBulkPreview &&
          <div className="variation-preview-message">Bulk edits will replace existing categories and variations</div>
        }
      </variations-body>
    );
  }

  render() {
    const { product } = this.props;

    const canWriteInventory = !!product.get(FIELDS.CAN_WRITE_INVENTORY);
    const inInlineEditing = !!product.get('_inInlineEditing', false);
    const inBulkPreview = product.get('_inBulkPreview', false) && !product.get('_unapplied');

    const classes = classNames('content', 'variations-inventory', 'inline', { 'displaying-preview': inBulkPreview, 'displaying-inline': inInlineEditing });

    return (
      <div className={classes}>
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

export default connect()(ProductRowInventory);
