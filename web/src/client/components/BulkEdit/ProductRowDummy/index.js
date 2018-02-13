import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Thumbnail from '../Thumbnail';
import Title from '../Title';

export class ProductRowDummy extends Component {
  static propTypes = {
    product: PropTypes.object.isRequired
  }

  render() {
    const { product } = this.props;

    return (
      <div className="content">
        <Thumbnail product={product} />
        <div className="body">
          <Title product={product} />
        </div>
      </div>);
  }
}

export default connect()(ProductRowDummy);
