import { List } from 'immutable';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';
import { CANNOT_EDIT_OCCASION_MESSAGE } from '../../../constants';

import { getAttribute, getAttributeWithNone, getAttributeOptionById } from 'global/modules/etsy/attributes/taxonomyNodeProperties';
import { ATTRIBUTES_IDS } from 'global/modules/etsy/constants';
import { getAttributeValue } from 'global/modules/etsy/utils';
import Thumbnail from '../Thumbnail';
import Title from '../Title';
import Dropdown from '../../Dropdown';
import CannotEdit from '../CannotEdit';

const getOpData = (product, value) => {
  return {
    type: BULK_EDIT_OP_CONSTS.OCCASION_SET,
    products: [product.get('id')],
    value
  };
};

export class ProductRowOccasion extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired
  }

  onChange = (section) => {
    if (!section) {
      this.props.dispatch(Actions.BulkEdit.cancelInlineEditOp());
    } else {
      const { product } = this.props;
      this.props.dispatch(Actions.BulkEdit.setInlineEditOpAndApply(getOpData(product, section)));
    }
  }

  renderAttributes(product) {
    const productOccasion = getAttributeValue(product.get(FIELDS.ATTRIBUTES, new List()), ATTRIBUTES_IDS.OCCASION);
    const formattedOccasion = product.get('_formattedOccasion');
    const inlinedOccasionValue = product.getIn(['_inInlineEditing', 'value']);
    const formated = !!formattedOccasion || !!inlinedOccasionValue;
    const occasion =  inlinedOccasionValue || formattedOccasion && formattedOccasion.get('new') || productOccasion;
    const statusData = product.getIn(['_status', 'data']);
    const classes = classNames({preview: formated});

    const taxonomyId = product.get('taxonomyId', null) || product.get('taxonomy_id', -1);
    const getOptionsFn = occasion ? getAttributeWithNone : getAttribute;
    const OPTIONS = getOptionsFn('occasion', taxonomyId).get('availableOptions', new List());
    const readOnly = OPTIONS.size === 1;
    const showDropdown = OPTIONS.size > 0;
    let selectionText = 'Choose Occasion';
    // we've got an invalid occasion being configured in this case, so we want to show the old occasion value
    if (showDropdown && statusData && formattedOccasion) {
      const oldOccasion = formattedOccasion.get('old');
      const oldOption = getAttributeOptionById('occasion', oldOccasion);
      if (oldOption) {
        selectionText = oldOption.get('name');
      }
    }

    if (!showDropdown) {
      return <span className="message error">{statusData}</span>;
    }

    return (
      <div className="bulk-edit--properties">
        <Dropdown textField="name" data={OPTIONS} value={occasion} selectionText={selectionText} readOnly={readOnly} className={classes} onChange={this.onChange} errorText={statusData} />
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
          { canWriteInventory && this.renderAttributes(product) }
          { !canWriteInventory && <CannotEdit message={CANNOT_EDIT_OCCASION_MESSAGE} /> }
        </div>
      </div>
    );
  }
}

export default connect()(ProductRowOccasion);
