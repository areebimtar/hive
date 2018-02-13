import { List } from 'immutable';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';
import { CANNOT_EDIT_HOLIDAY_MESSAGE } from '../../../constants';

import { getAttribute, getAttributeWithNone, getAttributeOptionById } from 'global/modules/etsy/attributes/taxonomyNodeProperties';
import { ATTRIBUTES_IDS } from 'global/modules/etsy/constants';
import { getAttributeValue } from 'global/modules/etsy/utils';
import Thumbnail from '../Thumbnail';
import Title from '../Title';
import Dropdown from '../../Dropdown';
import CannotEdit from '../CannotEdit';

const getOpData = (product, value) => {
  return {
    type: BULK_EDIT_OP_CONSTS.HOLIDAY_SET,
    products: [product.get('id')],
    value
  };
};

export class ProductRowHoliday extends Component {
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
    const productHoliday = getAttributeValue(product.get(FIELDS.ATTRIBUTES, new List()), ATTRIBUTES_IDS.HOLIDAY);
    const formattedHoliday = product.get('_formattedHoliday');
    const inlinedHolidayValue = product.getIn(['_inInlineEditing', 'value']);
    const formated = !!formattedHoliday || !!inlinedHolidayValue;
    const holiday =  inlinedHolidayValue || formattedHoliday && formattedHoliday.get('new') || productHoliday;
    const statusData = product.getIn(['_status', 'data']);
    const dropdownClasses = classNames({preview: formated}, 'product-row');

    const taxonomyId = product.get('taxonomyId', null) || product.get('taxonomy_id', -1);
    const getOptionsFn = holiday ? getAttributeWithNone : getAttribute;
    const OPTIONS = getOptionsFn('holiday', taxonomyId).get('availableOptions', new List());
    const readOnly = OPTIONS.size === 1;
    const showDropdown = OPTIONS.size > 0;
    let selectionText = 'Choose Holiday';
    // we've got an invalid holiday being configured in this case, so we want to show the old holiday value
    if (showDropdown && statusData && formattedHoliday) {
      const oldHoliday = formattedHoliday.get('old');
      const oldOption = getAttributeOptionById('occasion', oldHoliday);
      if (oldOption) {
        selectionText = oldOption.get('name');
      }
    }

    if (!showDropdown) {
      return <span className="message error">{statusData}</span>;
    }

    return (
      <div className="bulk-edit--properties">
        <Dropdown textField="name" data={OPTIONS} value={holiday} selectionText={selectionText} readOnly={readOnly} className={dropdownClasses} onChange={this.onChange} errorText={statusData} />
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
          { !canWriteInventory && <CannotEdit message={CANNOT_EDIT_HOLIDAY_MESSAGE} /> }
        </div>
      </div>
    );
  }
}

export default connect()(ProductRowHoliday);
