import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import enhanceWithClickOutside from '../../ClickOutside';
import classNames from 'classnames';

import * as taxonomyUtils from 'global/modules/etsy/bulkEditOps/taxonomyUtils';


export class TaxonomyDropdown extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    options: PropTypes.array,
    selected: PropTypes.number
  }

  render() {
    const { onChange, options, selected } = this.props;
    const getClasses = (taxonomy) => classNames({item: true, selected: taxonomy === selected});

    return (
      <div className="bulk-edit-dropdown" onClick={event => event.stopPropagation()}>
        <ul>
          { options.map(taxonomy => <li key={taxonomy} className={getClasses(taxonomy)} onClick={() => onChange(taxonomy)}>{taxonomyUtils.getTaxonomyName(taxonomy)}</li>) }
        </ul>
      </div>
    );
  }

  handleClickOutside = () => this.props.onChange()
}

export default connect()(
  enhanceWithClickOutside(
    TaxonomyDropdown
  )
);
