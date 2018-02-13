import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { FilterGroupTitle } from '../../components';
import * as Actions from '../../actions';


export class MainFilters extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string,
    filters: PropTypes.array
  }

  onClick = (value) =>
    this.props.dispatch(Actions.Shops.setMainFilters({[this.props.type]: value}));

  render() {
    const { type, filters } = this.props;
    return !!filters && !!filters.length && (
      <div className="main-filter-group">
        <FilterGroupTitle type={type} />
        <ul>
          { filters.map(filterValue => {
            return (
              <li key={filterValue.value} className={filterValue.selected ? 'active' : ''} onClick={() => this.onClick(filterValue.value)}>
                <a href="#">
                  {filterValue.name}
                </a>
                <span className="filter-items">{filterValue.count}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

export default connect()(MainFilters);
