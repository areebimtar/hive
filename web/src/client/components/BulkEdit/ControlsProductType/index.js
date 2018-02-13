import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { List } from 'immutable';
import { connect } from 'react-redux';
import { DropdownList } from 'react-widgets';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import dropdownListComponentWithAdd from '../DropdownListComponentWithAdd';
import DropdownItem from '../DropdownListComponentWithAdd/DropdownItem';

import { validateInput } from 'global/modules/shopify/bulkEditOps/validate/productType';

const ListComponent = dropdownListComponentWithAdd(() => true, validateInput, 'Product Type');

class ControlsProductType extends Component {
  static propTypes = {
    data: PropTypes.object,
    productTypes: PropTypes.array,
    setProductType: PropTypes.func.isRequired,
    applyPreviewOp: PropTypes.func.isRequired
  };

  getDropdownData(productTypes, value) {
    return [{id: 'None', value: 'None'}].concat(_.map(productTypes, productType =>
      ({id: productType, value: productType, class: classNames({ selected: productType === value })})));
  }

  render() {
    const { data, productTypes } = this.props;
    const value = data && data.get('value') || 'Choose Product Type';
    const valid = !!data;
    const classes = classNames({apply: true, inactive: !valid});
    const dropdownData = this.getDropdownData(productTypes, value);

    return (
      <div className="bulk-edit--actions">
        <div className="bulk-edit--action-items">
          <div className="bulk-edit--actionselector">
            <DropdownList
              valueField="value" textField="value"
              data={dropdownData}
              value={value}
              itemComponent={DropdownItem}
              listComponent={ListComponent}
              onChange={this.setOperationAndValue} />
          </div>
        </div>
        <div className="bulk-edit--actionform">
          <button className={classes} onClick={this.applyPreview} disabled={!valid}>Apply</button>
        </div>
      </div>
    );
  }

  setOperationAndValue = (item) =>
    this.props.setProductType(item.id || item)

  applyPreview = (event) => {
    event.stopPropagation();
    event.preventDefault();

    this.props.applyPreviewOp();
  }
}

export default connect(state => ({
  productTypes: state.getIn(['edit', 'productTypes'], new List()).toJS()
}), {
  setProductType: Actions.Shopify.Bulkedit.setProductType,
  applyPreviewOp: Actions.BulkEdit.applyPreviewOp
})(ControlsProductType);
