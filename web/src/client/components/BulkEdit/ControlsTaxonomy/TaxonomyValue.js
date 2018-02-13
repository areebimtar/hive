import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TAXONOMY_MAP } from 'app/client/constants/bulkEdit';


export class TaxonomyValue extends Component {
  static propTypes = {
    item: PropTypes.any
  };

  render() {
    const { item } = this.props;
    const value = (item && TAXONOMY_MAP[item]) ? TAXONOMY_MAP[item].name : 'Choose Category';
    return (<span>{ value }</span>);
  }
}
