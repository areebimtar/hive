import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import InlineEdit from './InlineEdit';

import Thumbnail from '../Thumbnail';

import { getChannelByName } from 'app/client/channels';

export class ProductRowTitle extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    context: PropTypes.object
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.product !== this.props.product;
  }


  onApply = () => this.props.dispatch(Actions.BulkEdit.applyInlineEditOp())
  onUpdate = (title) => this.props.dispatch(Actions.BulkEdit.setInlineEditOpValue(title))
  onClick = (product) => this.props.dispatch(Actions.BulkEdit.setInlineEditOp(this.getOpData(product)))

  getOpData = (product) => {
    const uiData = this.getUiData();
    return {
      type: uiData.BULK_EDIT_OP_CONSTS.TITLE_SET,
      products: [product.get('id')]
    };
  }

  getUiData = () => {
    const { context } = this.props;
    const { componentsConfig, BULK_EDIT_OP_CONSTS } = getChannelByName(context.channelName).getBulkEditConfig();
    const uiData = _.get(componentsConfig, ['photos', 'uiData']);
    return _.set(uiData, 'BULK_EDIT_OP_CONSTS', BULK_EDIT_OP_CONSTS);
  }

  render() {
    const { product } = this.props;

    const valid = product.getIn(['_status', 'valid']);
    const classes = classNames('message', {error: !valid});

    const _inInlineEditing = product.get('_inInlineEditing');
    const title = product.get('title');
    const _formattedTitle = product.get('_formattedTitle');

    const uiData = this.getUiData();

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          { _inInlineEditing && <InlineEdit initialValues={{value: title}} onApply={this.onApply} onUpdate={this.onUpdate} validate={uiData.validators.inline}/> }
          { !_inInlineEditing && (_formattedTitle ? <span className="title" dangerouslySetInnerHTML={ {__html: _formattedTitle } } onClick={event => !event.stopPropagation()}/> : <span className="title" onClick={event => !event.stopPropagation() &&  this.onClick(product)}>{title}</span>) }
          <div className={classes}>{product.getIn(['_status', 'data'])}</div>
        </div>
      </div>
    );
  }
}

export default connect()(ProductRowTitle);
