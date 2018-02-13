import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Map } from 'immutable';

export class FilterGroupTitle extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    groupNamesMap: PropTypes.object.isRequired,
    type: PropTypes.string.isRequired
  }

  render() {
    const { groupNamesMap, type } = this.props;
    const title = groupNamesMap.get(type);

    return (<h6>{title}</h6>);
  }
}

export default connect(state => ({
  groupNamesMap: state.getIn(['shopView', 'filtersMenuMap'], new Map())
}))(FilterGroupTitle);
