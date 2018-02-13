import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import SectionDropdown from './SectionDropdown';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import { FIELDS } from 'global/modules/etsy/constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';


const getOpData = (product) => {
  return {
    type: BULK_EDIT_OP_CONSTS.SECTION_SET,
    products: [product.get('id')]
  };
};

export class ProductRowSection extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    sectionsMap: PropTypes.object
  }

  onClick = (event) => {
    event.stopPropagation();
    const product = this.props.product;
    this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product)));
  }

  onChange = (section) => this.props.dispatch(section ? Actions.BulkEdit.setInlineEditOpValueAndApply(section) : Actions.BulkEdit.cancelInlineEditOp());

  render() {
    const { product, sectionsMap } = this.props;

    const sectionDropdownOptions = [{id: 'none', value: 'None'}].concat(_.map(sectionsMap.ids, id => ({ id, value: sectionsMap[id] })));

    const formattedSection = product.get('_formattedShopSectionId');
    const inlinedSectionValue = product.getIn(['_inInlineEditing', 'value']);
    const formated = !!formattedSection || !!inlinedSectionValue;
    const section =  inlinedSectionValue || formattedSection && formattedSection.get('new') || product.get(FIELDS.SECTION_ID);
    const name = !!section ? sectionsMap[section] || 'None' : 'Choose Section';
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
              <span className="section" onClick={this.onClick}>
                <div className={classes}><span>{name}</span></div>
              </span>
              { product.get('_inInlineEditing') && <SectionDropdown options={sectionDropdownOptions} selected={section} onChange={this.onChange}/> }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(state => ({
  sectionsMap: state.getIn(['edit', 'sectionsMap']).toJS()
}))(ProductRowSection);
