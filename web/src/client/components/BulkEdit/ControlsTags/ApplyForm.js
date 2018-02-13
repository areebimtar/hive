import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

import SingleInputForm from '../SingleInputForm';


export class ApplyForm extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    uiData: PropTypes.object,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  }

  getForm = (type) => {
    const { uiData } = this.props;

    switch (type) {
      case BULK_EDIT_OP_CONSTS.TAGS_ADD:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Tags (Separate multiple tags with commas)" validate={uiData.validators.add} />);
      case BULK_EDIT_OP_CONSTS.TAGS_DELETE:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Tags (Separate multiple tags with commas)"/>);
      default:
        throw new Error(`There is no handler for ${type}`);
    }
  }

  render() {
    const { type } = this.props;

    return (<div>{ this.getForm(type) }</div>);
  }
}

export default connect()(ApplyForm);
