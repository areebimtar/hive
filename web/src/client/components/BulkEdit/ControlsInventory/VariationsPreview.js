import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import classNames from 'classnames';

import { getOptionFormatter, getUiState } from '../../../../../../shared/modules/etsy/attributes/taxonomyNodeProperties';

import VariationOption from './VariationOption';
import VariationPreview from './VariationPreview';

export default class VariationsPreview extends Component {
  static propTypes = {
    variations: PropTypes.object,
    onClick: PropTypes.func,
    taxonomyId: PropTypes.number
  };

  static defaultProps = {
    variations: {},
    onClick: _.noop
  };

  render() {
    const { taxonomyId, variations, onClick } = this.props;

    const variationsArray = _.map(variations, _.identity)
      .map(variation => {
        const propertyId = parseInt(variation.propertyId, 10);
        const scaleId = parseInt(variation.scalingOptionId, 10);
        const uiState = getUiState({ taxonomyId: taxonomyId, propertyId: propertyId }).toJS();
        const propertyName = _.get(_.find(uiState.availableVariations, { id: propertyId }), 'displayName');
        _.set(variation, 'propertyName', propertyName || variation.formattedName);
        scaleId && _.set(variation, 'scaleName', _.get(_.find(uiState.availableScales, { id: scaleId }), 'name'));
        _.set(variation, 'formatter', getOptionFormatter(variation.scalingOptionId));
        return variation;
      }).sort((l) => l.first === true ? -1 : 1);
    const classes = classNames('variation-items-wrapper', 'preview', {'no-second-property': variationsArray.length < 2 });

    return (
      <div>
        <div className={classes}>
          { variationsArray.map((variation, index) => (
            <div key={index} className="variation-item read-only" onClick={onClick} >
              <VariationPreview variation={variation} onClick={onClick} />
              { variation.options && (
                <div>
                  <div className="variation-item-options-header">
                    <div className="add-option name-column">
                      Options
                    </div>
                    <div className="delete-column" />
                  </div>


                  <div className="variation-item-options">
                    { variation.options.map((option, idx) => (
                      <VariationOption key={idx} id={parseInt(option.id, 10)} readOnly={true} option={variation.formatter(option.value)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="no-second-property-message">No second property</div>
        </div>
      </div>
    );
  }
}
