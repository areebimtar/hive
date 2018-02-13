import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../../actions';

import ApplyForm from './ApplyForm';
import TaxonomySelector from './TaxonomySelector';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

const getOpData = (value) => {
  return {
    type: BULK_EDIT_OP_CONSTS.TAXONOMY_SET,
    value: value.toString()
  };
};

export class ControlsTaxonomy extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.object
  };

  onSubmit() {
    this.props.dispatch(Actions.BulkEdit.applyPreviewOp());
  }

  onChangeTaxonomy(index, value) {
    this.props.dispatch(Actions.BulkEdit.setOperationAndValue(getOpData(value)));
  }

  render() {
    const { data } = this.props;
    const value = data.get('value');
    const taxonomyId = Number(value, 10) || null;

    return (
      <div className="bulk-edit--actions bulk-edit--taxonomy">
        <TaxonomySelector data={taxonomyId} onChange={this.onChangeTaxonomy.bind(this)} />
        <ApplyForm onSubmit={this.onSubmit.bind(this)} value={taxonomyId} />
      </div>
    );
  }
}

export default connect()(ControlsTaxonomy);
