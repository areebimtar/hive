import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import SingleInputForm from '../SingleInputForm';
import FindAndReplaceForm from '../FindAndReplaceInputForm';


export class ApplyForm extends Component {
  static propTypes = {
    type: PropTypes.string,
    uiData: PropTypes.object,
    onApply: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired
  }

  getForm = (type) => {
    const { uiData } = this.props;

    switch (type) {
      case uiData.BULK_EDIT_OP_CONSTS.TITLE_ADD_AFTER:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Title" validate={uiData.validators.addAfter} />);
      case uiData.BULK_EDIT_OP_CONSTS.TITLE_ADD_BEFORE:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Title" validate={uiData.validators.addBefore} />);
      case uiData.BULK_EDIT_OP_CONSTS.TITLE_FIND_AND_REPLACE:
        return (<FindAndReplaceForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} validate={uiData.validators.replace} />);
      case uiData.BULK_EDIT_OP_CONSTS.TITLE_DELETE:
        return (<SingleInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Title" />);
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
