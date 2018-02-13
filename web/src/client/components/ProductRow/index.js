import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as Actions from '../../actions';
import {FormattedDate} from '../../components';

import Thumbnail from '../BulkEdit/Thumbnail';

export class ProductRow extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    product: PropTypes.object.isRequired
  }

  render() {
    const { product } = this.props;
    const selectChckBxClasses = classNames({
      checkbox: true,
      checked: product.selected
    });

    return (
      <div key={product.id} className={(product.selected) ? 'selected' : ''} onClick={() => this.toggleProduct(product.id)}>
        <Thumbnail product={product} />
        <div className="title">{product.title}</div>
        <div>{product.quantity}</div>
        <div>{product.price}</div>
        <div><FormattedDate date={product.creation_tsz} /></div>
        <div className="table-checkbox"><div className={selectChckBxClasses}/></div>
      </div>
    );
  }

  toggleProduct = (productId) => this.props.dispatch(Actions.Shops.toggleProduct(productId))
}

export default connect()(ProductRow);
