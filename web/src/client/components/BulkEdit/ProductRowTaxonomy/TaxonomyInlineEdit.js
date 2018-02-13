import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import * as taxonomyUtils from 'global/modules/etsy/bulkEditOps/taxonomyUtils';
import TaxonomyDropdown from './TaxonomyDropdown';


export class TaxonomyInlineEdit extends Component {
  static propTypes = {
    id: PropTypes.any,
    edited: PropTypes.string,
    preview: PropTypes.bool,
    status: PropTypes.string,
    onClick: PropTypes.func,
    onChange: PropTypes.func
  }

  render() {
    const { id, edited, preview, onClick, onChange, status } = this.props;
    const indexes = taxonomyUtils.getIndexes(id);
    const values = taxonomyUtils.getValues(id);
    const options = taxonomyUtils.getOptions(id);

    const classes = classNames('taxonomy-tag', 'bulk-edit-dropdown-parent', {preview: !status && preview});
    const statusClasses = classNames('message', {error: !!status});

    const getTaxonomyName = (index) => taxonomyUtils.getTaxonomyName(values[index]) || 'Choose Category';

    const regularSpan = (index) => <span className={classes} key={getTaxonomyName(index)} onClick={() => onClick(index)}><span>{getTaxonomyName(index)}</span></span>;
    const withDropdownSpan = (index) => <span className={classes} key={getTaxonomyName(index)}><span>{getTaxonomyName(index)}</span><TaxonomyDropdown options={options[index]} selected={values[index]} onChange={onChange}/></span>;

    return (
      <span className="taxonomy inline editing" onClick={(event) => event.stopPropagation()}>
        { indexes.map(index => (edited && index === edited) ? withDropdownSpan(index) : regularSpan(index)) }
        { status && <div className={statusClasses}>{status}</div> }
      </span>
    );
  }
}

export default connect()(TaxonomyInlineEdit);
