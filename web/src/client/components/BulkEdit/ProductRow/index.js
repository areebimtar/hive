import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../../actions';

export class ProductRow extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    template: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired,
    type: PropTypes.string,
    previewOpType: PropTypes.string
  }

  componentDidMount() {
    const boundingRect = !!this.refs.row && this.refs.row.getBoundingClientRect();
    const id = !!this.props.product.get('id');

    if (boundingRect && id) {
      this.props.dispatch(Actions.BulkEdit.setRowBoundingRect({ id, boundingRect }));
    }
  }

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.product !== this.props.product;
  }

  render() {
    const { product, type, previewOpType } = this.props;
    const Template = this.props.template;
    const id = product.get('id');
    const _selected = product.get('_selected');
    const valid = product.getIn(['_status', 'valid']);
    const classes = classNames({ [`row-type-${type}`]: true, row: true, selected: _selected, invalid: !valid, [previewOpType]: true });
    const selectChckBxClasses = classNames({ checkbox: true, checked: _selected });

    return (
      <div ref="row" key={id} className={classes} onClick={() => this.toggleProduct(id)}>
        <Template product={product} />
        <div className="table-checkbox"><div className={selectChckBxClasses}/></div>
      </div>
    );
  }

  toggleProduct = (productId) => this.props.dispatch(Actions.BulkEdit.toggleProduct(productId))
}

export default connect()(ProductRow);
