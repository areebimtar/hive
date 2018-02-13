import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class Title extends Component {
  static propTypes = {
    product: PropTypes.object
  };

  render() {
    const { product } = this.props;

    return (<div className="title">{product.get('title')}</div>);
  }
}
