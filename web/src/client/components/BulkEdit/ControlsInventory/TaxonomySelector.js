import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { TAXONOMY_MAP } from 'app/client/constants/bulkEdit';
import Dropdown from './Dropdown';
import Images from '../../../img';


class TaxonomyValue extends Component {
  static propTypes = {
    item: PropTypes.any
  };

  render() {
    const { item } = this.props;
    const value = (item && TAXONOMY_MAP[item]) ? TAXONOMY_MAP[item].name : 'Choose Category';
    return (<span>{ value }</span>);
  }
}

export default class TaxonomySelector extends Component {
  static propTypes = {
    options: PropTypes.array,
    indexes: PropTypes.array,
    values: PropTypes.array,
    readOnly: PropTypes.bool,
    onChange: PropTypes.func,
    showTip: PropTypes.bool
  };

  render() {
    const { options, indexes, values, readOnly, showTip } = this.props;
    const classes = classNames('bulk-edit--action-items', { 'read-only': readOnly});

    return (
      <div className={classes}>
        { indexes.map(index =>
          <div key={index} className="bulk-edit--actionselector">
            <Dropdown
              data={options[index]}
              valueComponent={TaxonomyValue}
              itemComponent={TaxonomyValue}
              value={values[index]}
              onChange={(value) => this.props.onChange(value)}
              readOnly={readOnly} />
          </div>
        )}
        { showTip && <div className="taxonomy-tip"><img src={Images.lightbulb}/><span className="hint">Hint</span>&nbsp;&nbsp;Category determines variation properties and options</div>}
      </div>
    );
  }
}
