import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import InlineEdit from './InlineEdit';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/shopify/bulkOpsConstants';
import { FIELDS } from 'global/modules/shopify/constants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

const getOpData = (product) => {
  return {
    type: BULK_EDIT_OP_CONSTS.BODY_HTML_SET,
    products: [product.get(FIELDS.ID)],
    value: product.get(FIELDS.BODY_HTML)
  };
};

export class ProductRowBodyHtml extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    context: PropTypes.object
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.product !== this.props.product;
  }

  componentDidUpdate() {
    const props = this.props;
    // get current operation
    const opType = props.context && props.context.opType;
    // where should we scroll?
    const scrollTo = opType === BULK_EDIT_OP_CONSTS.BODY_HTML_ADD_AFTER ? 'bottom' : 'top';
    // get bodyHtml text element
    const bodyHtml = this.refs.bodyHtml;

    if (!bodyHtml || !scrollTo) { return; }

    // invoke scrolling only if it is needed. we already might be at correct possition
    switch (scrollTo) {
      case 'top':
        if (bodyHtml.scrollTop !== 0 ) {
          bodyHtml.scrollTop = 0;
        }
        break;
      case 'bottom':
        if (bodyHtml.scrollTop < bodyHtml.scrollHeight - bodyHtml.clientHeight) {
          bodyHtml.scrollTop = bodyHtml.scrollHeight;
        }
        break;
      default:
        break;
    }
  }

  onApply = () => this.props.dispatch(Actions.BulkEdit.applyInlineEditOp())
  onUpdate = (bodyHtml) => this.props.dispatch(Actions.BulkEdit.setInlineEditOpValue(bodyHtml))
  onClick = (product) => this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product)))

  getBodyHtml = (product) => {
    const productBodyHtml = product.get('body_html');
    const _formattedBodyHtml = product.get('_formattedBodyHtml');
    if (!_formattedBodyHtml) {
      return (<span className="bodyHtml-container"><span ref="bodyHtml" className="bodyHtml" dangerouslySetInnerHTML={ {__html: productBodyHtml } } onClick={event => !event.stopPropagation() && this.onClick(product)} /></span>);
    } else {
      const formatted = _formattedBodyHtml.toJS();
      const showControls = !!formatted.count;
      const bodyHtml = formatted.value;

      const classes = classNames({bodyHtml: true});

      return (
        <span className="bodyHtml-container">
          <span ref="bodyHtml" className={classes} dangerouslySetInnerHTML={ {__html: bodyHtml } } />
          { showControls && <div className="preview">{formatted.countMsg}</div> }
        </span>
      );
    }
  }

  renderBodyHtml(isInlineEditing, product) {
    if (isInlineEditing) {
      const initVal = {value: product.get('body_html')};
      return <InlineEdit initialValues={initVal} onApply={this.onApply} onUpdate={this.onUpdate}/>;
    } else {
      return this.getBodyHtml(product);
    }
  }

  renderViolation(product) {
    if (!product.getIn(['_status', 'valid'])) {
      return <div className="message error">{product.getIn(['_status', 'data'])}</div>;
    } else {
      return undefined; // TODO: what to return?
    }
  }

  render() {
    const { product } = this.props;
    const isInlineEditing = product.get('_inInlineEditing');

    return (
      <div className="content" ref="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
          { this.renderBodyHtml(isInlineEditing, product) }
          { this.renderViolation(product) }
        </div>
      </div>
    );
  }

  toggleExpanded = (event, expanded) => !event.stopPropagation() && this.props.dispatch(Actions.BulkEdit.setProductPreviewStatus({id: this.props.product.get('id'), data: { bodyHtml: {expanded} } }))
}

export default connect()(ProductRowBodyHtml);
