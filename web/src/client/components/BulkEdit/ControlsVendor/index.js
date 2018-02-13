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

import { validateInput } from 'global/modules/shopify/bulkEditOps/validate/vendor';

const ListComponent = dropdownListComponentWithAdd(() => true, validateInput, 'Vendor');

class ControlsVendor extends Component {
  static propTypes = {
    data: PropTypes.object,
    vendors: PropTypes.array,
    setVendor: PropTypes.func.isRequired,
    applyPreviewOp: PropTypes.func.isRequired
  };

  getDropdownData(vendors, value) {
    return [{id: 'None', value: 'None'}].concat(_.map(vendors, vendor =>
      ({id: vendor, value: vendor, class: classNames({ selected: vendor === value })})));
  }

  render() {
    const { data, vendors } = this.props;
    const value = data && data.get('value') || 'Choose Vendor';
    const valid = !!data;
    const classes = classNames({apply: true, inactive: !valid});
    const dropdownData = this.getDropdownData(vendors, value);

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
    this.props.setVendor(item.id || item)

  applyPreview = (event) => {
    event.stopPropagation();
    event.preventDefault();

    this.props.applyPreviewOp();
  }
}

export default connect(state => ({
  vendors: state.getIn(['edit', 'vendors'], new List()).toJS()
}), {
  setVendor: Actions.Shopify.Bulkedit.setVendor,
  applyPreviewOp: Actions.BulkEdit.applyPreviewOp
})(ControlsVendor);
