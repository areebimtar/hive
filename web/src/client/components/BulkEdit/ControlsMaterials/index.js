import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { DropdownList } from 'react-widgets';

import * as Actions from '../../../actions';
import { MATERIALS_OPTIONS } from 'app/client/constants/bulkEdit';
import ApplyForm from './ApplyForm';


class ControlsMaterials extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object
  };

  render() {
    const { data } = this.props;
    const type = data.get('type');

    return (
      <div className="bulk-edit--actions">
        <div className="bulk-edit--actionselector">
          <DropdownList data={MATERIALS_OPTIONS}
            valueField="type" textField="text"
            defaultValue={type}
            value={type}
            onChange={this.setOperation.bind(this)} />
        </div>
        <div className="bulk-edit--actionform">
          <ApplyForm type={type} onApply={this.applyOp.bind(this)} onUpdate={this.setValue.bind(this)} />
        </div>
      </div>
    );
  }

  setValue(value) {
    this.props.dispatch(Actions.BulkEdit.setValue(value));
  }
  setOperation(operation) {
    this.props.dispatch(Actions.BulkEdit.setOperation(operation.type));
  }
  applyOp() {
    this.props.dispatch(Actions.BulkEdit.applyPreviewOp());
  }
}

export default connect()(ControlsMaterials);
