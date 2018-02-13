import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { DropdownList } from 'react-widgets';

import DropDownAdd from '../../DropDownAdd';
import { validateCustomProperty } from 'global/modules/etsy/bulkEditOps/validate/variationsInventory';

const customPropertyValidator = (value) => {
  // if there's no value, we don't want to show an error message, the add button will already
  // be disabled.
  return value ? validateCustomProperty(value) : null;
};

export default class VariationSettings extends Component {
  static propTypes = {
    variation: PropTypes.object.isRequired,
    variationUIState: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    disabledPropertyId: PropTypes.number
  };

  static defaultProps = {
    readOnly: false,
    bulk: false,
    disabledPropertyId: null
  };


  onChange(key, change) {
    const { variation, onChange, variationUIState } = this.props;

    let result = _.set(variation, 'scalingOptionId', null);
    result = _.set(result, key, change.id);

    const suggestedVariation = _.find(variationUIState.availableVariations, { id: variation.propertyId });
    result = _.set(variation, 'formattedName', _.get(suggestedVariation, 'displayName', ''));

    onChange(result);
  }

  onAddItem(value) {
    const { onChange } = this.props;
    const variation = _.get(this.props, 'variation', {});

    variation.isCustomProperty = true;
    variation.formattedName = value;
    variation.propertyId = null;

    onChange(variation);
  }

  render() {
    const { variation, variationUIState, readOnly, disabledPropertyId } = this.props;

    const showScales = !!variationUIState.availableScales.length;
    const disabledPropertyDropdown = readOnly ? true : [disabledPropertyId];

    return (
      <div className="variation-item-settings">
        <div className="setting property">
          <div className="value">
            <DropDownAdd
              data={variationUIState.availableVariations}
              valueField="id"
              textField="displayName"
              value={variation.propertyId}
              placeholder={readOnly ? 'Choose Above' : 'Choose Property'}
              addPlaceholder="Add Property"
              onChange={this.onChange.bind(this, 'propertyId')}
              onAddItem={this.onAddItem.bind(this)}
              disabled={disabledPropertyDropdown}
              validate={customPropertyValidator}
            />
          </div>
        </div>
        {
          showScales &&
            <div className="setting scale">
              <div className="value">
                <DropdownList
                  data={variationUIState.availableScales}
                  valueField="id"
                  textField="name"
                  value={parseInt(variation.scalingOptionId, 10)}
                  placeholder={readOnly ? 'Choose Above' : 'Choose Scale'}
                  onChange={this.onChange.bind(this, 'scalingOptionId')}
                  disabled={readOnly}
                />
              </div>
            </div>
        }
      </div>
    );
  }
}
