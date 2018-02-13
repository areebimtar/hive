import { List } from 'immutable';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';
import * as Actions from '../../../actions';
import { getAttributeWithNone } from 'global/modules/etsy/attributes/taxonomyNodeProperties';

import Dropdown from '../../Dropdown';

const OPTIONS = getAttributeWithNone('holiday').get('availableOptions', new List());

export class ControlsHoliday extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object
  };

  onChange = (holiday) => this.props.dispatch(Actions.BulkEdit.setOperationAndValue({
    type: BULK_EDIT_OP_CONSTS.HOLIDAY_SET,
    value: holiday
  }))

  render() {
    const { data } = this.props;
    const value = data && data.get('value', null);
    const valid = !!value;
    const classes = classNames({apply: true, inactive: !valid});

    return (
      <div className="bulk-edit--actions">
        <div className="bulk-edit--action-items">
            <div className="bulk-edit--actionselector">
            <Dropdown
              valueField="id" textField="name"
              data={OPTIONS}
              value={value}
              selectionText="Choose Holiday"
              onChange={this.onChange} />
            </div>
        </div>
        <div className="bulk-edit--actionform">
          <button className={classes} onClick={this.applyOp.bind(this)} disabled={!valid}>Apply</button>
        </div>
      </div>
    );
  }

  applyOp() {
    return this.props.dispatch(Actions.BulkEdit.applyPreviewOp());
  }
}

export default connect()(ControlsHoliday);
