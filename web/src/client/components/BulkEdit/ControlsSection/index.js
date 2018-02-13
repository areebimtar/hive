import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { DropdownList } from 'react-widgets';
import classNames from 'classnames';

import { validateInput } from 'global/modules/etsy/bulkEditOps/validate/section';
import { BULK_EDIT_OP_CONSTS, BULK_EDIT_VALIDATIONS } from 'global/modules/etsy/bulkOpsConstants';
import * as Actions from '../../../actions';
import dropdownListComponentWithAdd from '../DropdownListComponentWithAdd';
import DropdownItem from '../DropdownListComponentWithAdd/DropdownItem';

const getSectionOptions = (sectionsMap) => {
  const options = [ {id: 'none', value: 'None'} ];
  return options.concat(_.map(sectionsMap.ids, id => ({ id, value: sectionsMap[id] })));
};

const isAddNewVisible = data => data && data.length <= BULK_EDIT_VALIDATIONS.SECTION_MAX_LENGTH;
const ListComponent = dropdownListComponentWithAdd(isAddNewVisible, validateInput, 'Section');

class ControlsSection extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object,
    sectionsMap: PropTypes.object
  };

  render() {
    const { data, sectionsMap } = this.props;
    const value = (data.get('value')) ? (sectionsMap[data.get('value')] || data.get('value')) : 'Choose Section';
    const valid = !!data.get('value');
    const classes = classNames({apply: true, inactive: !valid});

    const getNewSectionValue = (val) => _.find(sectionsMap.ids, id => sectionsMap[id].toLowerCase() === val.toLowerCase().trim()) || val;

    return (
      <div className="bulk-edit--actions">
        <div className="bulk-edit--action-items">
            <div className="bulk-edit--actionselector">
            <DropdownList
              valueField="id" textField="value"
              data={getSectionOptions(sectionsMap)}
              value={value}
              itemComponent={DropdownItem}
              listComponent={ListComponent}
              onChange={(val) => this.setOperationAndValue(getNewSectionValue(val.id || val))} />
            </div>
        </div>
        <div className="bulk-edit--actionform">
          <button className={classes} onClick={this.applyOp.bind(this)} disabled={!valid}>Apply</button>
        </div>
      </div>
    );
  }

  setOperationAndValue(id) {
    return this.props.dispatch(Actions.BulkEdit.setSectionOperationAndValue({
      type: BULK_EDIT_OP_CONSTS.SECTION_SET,
      value: id
    }));
  }
  applyOp() {
    return this.props.dispatch(Actions.BulkEdit.applyPreviewOp());
  }
}

export default connect(state => ({
  sectionsMap: state.getIn(['edit', 'sectionsMap']).toJS()
}))(ControlsSection);
