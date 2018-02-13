import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class DropdownItem extends Component {
  static propTypes = {
    item: PropTypes.object
  }

  render() {
    const { item } = this.props;

    return (<span className={item.class || ''}>{item.value}</span>);
  }
}
