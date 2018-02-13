import React, { Component } from 'react';
import { DropdownList } from 'react-widgets';

import List from './list';
import Item from './item';

export default class DropDownAdd extends Component {
  static propTypes = {
  };

  render() {
    return (<DropdownList
      {...this.props}
      itemComponent={Item}
      listComponent={List}
    />);
  }
}
