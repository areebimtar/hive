import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropdownList } from 'react-widgets';

export default class Dropdown extends Component {
  static propTypes = {
    data: PropTypes.any,
    valueComponent: PropTypes.any,
    itemComponent: PropTypes.any,
    value: PropTypes.any,
    onChange: PropTypes.func,
    readOnly: PropTypes.bool
  };

  render() {
    const { data, valueComponent, itemComponent, value, onChange, readOnly } = this.props;

    return (
      <DropdownList
        data={data}
        valueComponent={valueComponent}
        itemComponent={itemComponent}
        value={value}
        onChange={onChange}
        readOnly={readOnly} />);
  }
}
