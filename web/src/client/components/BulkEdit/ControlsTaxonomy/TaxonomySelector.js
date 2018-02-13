import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { DropdownList } from 'react-widgets';
import * as taxonomyUtils from 'global/modules/etsy/bulkEditOps/taxonomyUtils';
import classNames from 'classnames';

import { TaxonomyValue } from './TaxonomyValue';

export class TaxonomySelector extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    data: PropTypes.number,
    readOnly: PropTypes.bool,
    onChange: PropTypes.func,
    emptyMessage: PropTypes.string
  };

  render() {
    const { data: taxonomy, readOnly, emptyMessage } = this.props;
    const indexes = taxonomyUtils.getIndexes(taxonomy);
    const values = taxonomyUtils.getValues(taxonomy);
    const options = taxonomyUtils.getOptions(taxonomy);

    const showEmptyMessage = emptyMessage && values.length === 1 && !values[0];

    const classes = classNames('bulk-edit--action-items', { 'read-only': readOnly});

    return (
      <div className={classes}>
        { indexes.map(index =>
          <div key={index} className="bulk-edit--actionselector">
            <DropdownList
              data={options[index]}
              valueComponent={TaxonomyValue}
              itemComponent={TaxonomyValue}
              value={values[index]}
              onChange={(value) => this.props.onChange(index, value)}
              readOnly={readOnly} />
            { showEmptyMessage ? <div className="empty-taxonomy-error">{emptyMessage}</div> : undefined }
          </div>
        )}
      </div>
    );
  }
}

export default connect()(TaxonomySelector);
