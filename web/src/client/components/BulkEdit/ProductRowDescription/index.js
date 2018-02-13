import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';
import InlineEdit from './InlineEdit';
import { BULK_EDIT_OP_CONSTS } from 'global/modules/etsy/bulkOpsConstants';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

const getOpData = (product) => {
  return {
    type: BULK_EDIT_OP_CONSTS.DESCRIPTION_SET,
    products: [product.get('id')]
  };
};

const getAdditionalLines = (context) => {
  if (!context) { return 0; }

  const extended = context.opType === BULK_EDIT_OP_CONSTS.DESCRIPTION_FIND_AND_REPLACE ||
    context.opType === BULK_EDIT_OP_CONSTS.DESCRIPTION_DELETE;

  return extended ? 1 : 0;
};

export class ProductRowDescription extends Component {
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
    const scrollTo = opType === BULK_EDIT_OP_CONSTS.DESCRIPTION_ADD_AFTER ? 'bottom' : 'top';
    // get description text element
    const description = this.refs.description;

    if (!description || !scrollTo) { return; }

    // invoke scrolling only if it is needed. we already might be at correct possition
    switch (scrollTo) {
      case 'top':
        if (description.scrollTop !== 0 ) {
          description.scrollTop = 0;
        }
        break;
      case 'bottom':
        if (description.scrollTop < description.scrollHeight - description.clientHeight) {
          description.scrollTop = description.scrollHeight;
        }
        break;
      default:
        break;
    }
  }

  onApply = () => this.props.dispatch(Actions.BulkEdit.applyInlineEditOp())
  onUpdate = (description) => this.props.dispatch(Actions.BulkEdit.setInlineEditOpValue(description))
  onClick = (product) => this.props.dispatch(Actions.BulkEdit.setInlineEditOp(getOpData(product)))

  getDescription = (product) => {
    const productDescription = product.get('description');
    const _formattedDescription = product.get('_formattedDescription');
    if (!_formattedDescription) {
      return (<span className="description-container"><span ref="description" className="description" onClick={event => !event.stopPropagation() && this.onClick(product)}>{productDescription}</span></span>);
    } else {
      const formatted = _formattedDescription.toJS();
      const isExpanded = !!product.getIn(['_status', 'description', 'expanded']);
      const showControls = !!formatted.count;
      const description = isExpanded ? formatted.fullValue : formatted.value;
      const additionalLines = getAdditionalLines(this.props.context);

      const classes = classNames({description: true, expanded: isExpanded});
      const containerClasses = classNames('description-container', { expanded: isExpanded });
      const containerInlineStyle = !isExpanded && {height: `${(formatted.lineCount + additionalLines) * 20}px`} || {};
      const inlineStyle = !isExpanded && { height: `${formatted.lineCount * 20}px` } || {};

      return (
        <span className={containerClasses} style={containerInlineStyle} onClick={event => this.toggleExpanded(event, !isExpanded)}>
          <span ref="description" className={classes} style={inlineStyle} dangerouslySetInnerHTML={ {__html: description } } />
          { showControls && isExpanded && <div className="preview expanded">Show less</div> }
          { showControls && !isExpanded && <div className="preview">{formatted.countMsg}</div> }
        </span>
      );
    }
  }

  renderDescription(isInlineEditing, product) {
    if (isInlineEditing) {
      const initVal = {value: product.get('description')};
      return <InlineEdit initialValues={initVal} onApply={this.onApply} onUpdate={this.onUpdate}/>;
    } else {
      return this.getDescription(product);
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
          { this.renderDescription(isInlineEditing, product) }
          { this.renderViolation(product) }
        </div>
      </div>
    );
  }

  toggleExpanded = (event, expanded) => !event.stopPropagation() && this.props.dispatch(Actions.BulkEdit.setProductPreviewStatus({id: this.props.product.get('id'), data: { description: {expanded} } }))
}

export default connect()(ProductRowDescription);
