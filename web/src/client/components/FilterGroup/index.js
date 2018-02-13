import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import {FilterGroupTitle, FilterRow} from '../../components';
import * as Actions from '../../actions';


const SHOW_LESS_COUNT = 5;

const toggleFilter = (dispatch, type, filter) => dispatch(Actions.Shops.toggleFilter({ type, filter }));
const toggleExpanded = (dispatch, type) => dispatch(Actions.Shops.toggleExpanded(type));

const shapeFilterData = (expanded, type, filters, dispatch) => {
  // extent products filter data (filter and its count) with click handler and selected flag
  const data = _.map(filters, filter => ({
    ...filter,
    clickHandler: () => toggleFilter(dispatch, type, filter)
  }));

  if (expanded) { return data; }
  return data.splice(0, SHOW_LESS_COUNT);
};

export class FilterGroup extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    type: PropTypes.string.isRequired,
    filters: PropTypes.array.isRequired,
    expanded: PropTypes.object.isRequired
  }

  render() {
    const { type, expanded, dispatch } = this.props;
    const filters = shapeFilterData(expanded[type], type, this.props.filters, dispatch);
    return (
      <div className="filter-group">
        <FilterGroupTitle type={type} />
        <ul>
          {filters.map(data => (
            <FilterRow key={data.name} {...data} group={type} />
          ))}
          {(this.props.filters.length > SHOW_LESS_COUNT) && <li><a href="#" className={expanded[type] ? 'show-less' : 'show-all'} onClick={() => toggleExpanded(dispatch, type)}>{expanded[type] ? 'Show Less' : 'Show All'}</a></li>}
        </ul>
      </div>
    );
  }
}

export default connect(state => ({
  expanded: state.getIn(['shopView', 'expandedGroups']).toJS()
}))(FilterGroup);
