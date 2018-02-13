import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getTaxonomyArray } from 'global/modules/etsy/bulkEditOps/taxonomyUtils';


export default class TaxonomyPreview extends Component {
  static propTypes = {
    taxonomy: PropTypes.number
  };

  render() {
    const { taxonomy } = this.props;
    const values = getTaxonomyArray(taxonomy);

    return (
      <div className="taxonomy-preview">
        { values.map(value => <span key={value} className="taxonomy" >{value}</span>) }
      </div>
    );
  }
}
