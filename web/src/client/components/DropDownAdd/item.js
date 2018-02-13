import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class Item extends Component {
  static propTypes = {
    item: PropTypes.object,
    text: PropTypes.string
  };

  render() {
    const { item, text } = this.props;

    return (<span className={item.class || ''}>{text || item.name}</span>);
  }
}
