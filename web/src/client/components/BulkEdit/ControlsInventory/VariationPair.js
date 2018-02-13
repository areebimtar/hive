import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import _ from 'lodash';
import { fromJS } from 'immutable';

import VariationEdit from './VariationEdit';

export default class VariationPair extends Component {
  static propTypes = {
    variations: PropTypes.object,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    onChange: PropTypes.func
  };

  static defaultProps = {
    variations: [],
    readOnly: false,
    bulk: false,
    inline: false,
    onChange: _.noop
  }

  onChange(index, variation) {
    const { variations, onChange } = this.props;

    onChange(variations.map(item => item.get('variation')).set(index, fromJS(variation)));
  }

  render() {
    const { variations, readOnly, bulk, inline } = this.props;
    const classes = classNames('variation-items-wrapper', { bulk: bulk, active: readOnly, 'no-second-property': bulk && variations.size < 2 });

    return (
      <div className={classes}>
        { variations.map((variation, index) => <VariationEdit {...variation.toJS()} readOnly={readOnly} bulk={bulk} inline={inline} first={index === 0} onChange={this.onChange.bind(this, index)} />) }
        <div className="no-second-property-message">No second property</div>
      </div>
    );
  }
}
