import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import SingleTextInputForm from '../SingleTextInputForm';
import SingleHtmlInputForm from '../SingleHtmlInputForm';
import FindAndReplaceInputHtmlForm from '../FindAndReplaceInputHtmlForm';


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
      case uiData.BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER:
        return (<SingleHtmlInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="BODY_HTML" validate={uiData.validators.addAfter} />);
      case uiData.BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_BEFORE:
        return (<SingleHtmlInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="BODY_HTML" validate={uiData.validators.addBefore} />);
      case uiData.BULK_EDIT_OP_CONSTS.BODY_HTML_FIND_AND_REPLACE:
        return (<FindAndReplaceInputHtmlForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} validate={uiData.validators.replace} />);
      case uiData.BULK_EDIT_OP_CONSTS.BODY_HTML_DELETE:
        return (<SingleTextInputForm onApply={this.props.onApply} onUpdate={this.props.onUpdate} placeholder="Description" validate={uiData.validators.delete} />);
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
