import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';


export class FilterRow extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    group: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    clickHandler: PropTypes.func.isRequired,
    selected: PropTypes.bool
  }

  render() {
    const { count, name, clickHandler, selected } = this.props;

    const classes = classNames({
      checkbox: true,
      checked: selected
    });

    return (
      <li key={name} onClick={clickHandler}>
        <span className={classes} />
        <div title={name}>{name}</div>
        <span className="filter-items">{count}</span>
      </li>);
  }
}

export default connect()(FilterRow);
