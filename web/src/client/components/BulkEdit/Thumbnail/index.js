import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FIELDS } from 'global/modules/etsy/constants';


const THUMBNAIL_PLACEHOLDER_URL = 'http://placehold.it/36x36';

export default class Thumbnail extends Component {
  static propTypes = {
    product: PropTypes.object
  };

  shouldComponentUpdate(nextProps /* , nextState */) {
    return nextProps.product.getIn([FIELDS.PHOTOS, 0, 'thumbnail_url']) !== this.props.product.getIn([FIELDS.PHOTOS, 0, 'thumbnail_url']);
  }

  render() {
    const { product } = this.props;
    const url = product.getIn([FIELDS.PHOTOS, 0, 'thumbnail_url']) || THUMBNAIL_PLACEHOLDER_URL;

    return (<div className="thumbnail"><img src={url} /></div>);
  }
}
