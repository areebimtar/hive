import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { FilterGroup, MainFilters, MagicToggles } from '../../components';


export class Filters extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    filters: PropTypes.array,
    states: PropTypes.array,
    magicOptions: PropTypes.array
  }

  render() {
    const { filters, magicOptions } = this.props;

    const mainFilters = _.filter(filters, { type: 'main' });
    const productFilters = _.filter(filters, { type: 'secondary' });

    return (
      <app-sidebar--filter-container>
        { mainFilters && mainFilters.map(filter =>
          <MainFilters key={filter.groupName} type={filter.groupName} filters={filter.filters} />
        )}
        <div className="filter-group-wrapper">
          <div className="filter-group-scroll">
            <div className="filter-group-content">
              { productFilters && productFilters.map(filter => (
                  <FilterGroup key={filter.groupName} type={filter.groupName} filters={filter.filters} />
              ))}
              <MagicToggles magicOptions={magicOptions} />
            </div>
          </div>
        </div>
      </app-sidebar--filter-container>
    );
  }
}

export default connect()(Filters);
