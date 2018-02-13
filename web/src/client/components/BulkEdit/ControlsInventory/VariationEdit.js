import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import _ from 'lodash';
import classNames from 'classnames';

import VariationSettings from './VariationSettings';
import VariationOption from './VariationOption';
import AddComboOption from './AddComboOption';

import { ItemTypes, MAXIMUM_NUMBER_OF_OPTIONS } from 'global/modules/etsy/bulkOpsConstants';

import { insertOptions } from 'global/modules/etsy/variations/variationUiUtil';

import { getBrowserInfo } from '../../../utils';

const THRESOLD = 20; // px
const SPEED = 250; // px/s

const optionTarget = {
  drop(props, monitor, component) {
    // option is dropped down, cancel scrolling
    component.animationStart = 0;
  },
  hover(props, monitor, component) {
    const browserInfo = getBrowserInfo();
    if (browserInfo.name.toLowerCase() === 'chrome') { return; }

    // get mouse offset in parent container
    const mouseOffset = monitor.getClientOffset();
    // get bounding box of parent conatainer
    const boundingRect = component.dndContainer.getBoundingClientRect();
    // calculate distances to top and to bottom edge
    const topDelta = mouseOffset.y - boundingRect.top;
    const bottomDelta = boundingRect.bottom - mouseOffset.y;

    // scroll content in requestAnimationFrame callback
    const scroll = (now) => {
      component.dndContainer.scrollTop += component.ridection * ((now - component.animationStart) / 1000) * SPEED;
      if (component.animationStart) {
        component.animationStart = now;
        requestAnimationFrame(scroll);
      }
    };

    // in which direction we should scroll container?
    let ridection = 0;
    if (topDelta < THRESOLD) {
      ridection = -1;
    } else if (bottomDelta < THRESOLD) {
      ridection = 1;
    }

    component.ridection = ridection;
    // if ridection is non zero, start animation frame (unless scroll is already in progress)
    if (ridection) {
      if (!component.animationStart) {
        component.animationStart = performance.now();
        requestAnimationFrame(scroll);
      }
    } else {
      // cancel scrolling
      component.animationStart = 0;
    }
  }
};

@DropTarget(ItemTypes.OPTION, optionTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))
export default class VariationEdit extends Component {
  static propTypes = {
    variation: PropTypes.object.isRequired,
    validity: PropTypes.any,
    uiState: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    canEnableDelete: PropTypes.bool,
    disabledPropertyId: PropTypes.number,
    first: PropTypes.bool.isRequired,

    // DnD props
    connectDropTarget: PropTypes.func.isRequired
  };

  static defaultProps = {
    readOnly: false,
    bulk: false,
    inline: false,
    canEnableDelete: false,
    disabledPropertyId: null
  };

  constructor() {
    super();
    this.state = {};
  }

  onChange(key, value) {
    const { variation, onChange } = this.props;
    onChange(key ? _.set(variation, key, value) : value);
  }

  onVariationOptionDelete = (index) => {
    const { variation: { options } } = this.props;
    options.splice(index, 1);
    this.onChange('options', options);
  }

  onRemoveVariation = () => {
    this.onChange(null);
  }

  onAddOptions(suggestedOptions, newOptions) {
    const { variation: { options } } = this.props;
    this.onChange('options', insertOptions(newOptions, options, suggestedOptions));
  }

  getOptions() {
    return this.state.inDnD ? this.state.options : this.props.variation.options;
  }

  render() {
    const { variation, validity, uiState, readOnly, bulk, inline, canEnableDelete, connectDropTarget, disabledPropertyId, first } = this.props;

    const enableDelete = !readOnly && canEnableDelete;

    const options = this.getOptions();
    const variationItemClasses = classNames('variation-item', { 'read-only': readOnly });
    const showOptions = options && (uiState.readyForOptions || options.length > 0);
    const disableAddButton = options.length >= MAXIMUM_NUMBER_OF_OPTIONS;
    const showError = validity && (bulk || inline);
    const hasOptions = options && options.length > 0;

    return (
      <div className={variationItemClasses} onClick={(ev) => ev.stopPropagation() } >
        { !(showOptions || first) && <div className="no-property-message">No second property</div> }
        <div className="settings-and-delete-wrapper">
          <div className="error-container">
            <VariationSettings
              variation={variation}
              variationUIState={uiState}
              onChange={this.onChange.bind(this, null)}
              disabledPropertyId={disabledPropertyId}
              readOnly={readOnly}
              bulk={bulk}
            />
            { showError && !uiState.readyForOptions && <div className="error">{validity}</div> }
          </div>

          { enableDelete ? <div className="delete-variation-item" onClick={this.onRemoveVariation} /> : undefined }
        </div>
        { options && (uiState.readyForOptions || options.length > 0) && (
          <div>
            <div className="variation-item-options-header">
              <div className="add-option name-column">
                Options
              </div>
              <div className="delete-column" />
            </div>


            { connectDropTarget(<div ref={container => _.set(this, 'dndContainer', container)} className="variation-item-options">
              { options.map((option, i) => (
                <VariationOption key={option.id}
                                 id={option.id}
                                 index={i}
                                 readOnly={readOnly}
                                 option={option.label}
                                 onDelete={this.onVariationOptionDelete}
                                 moveOption={this.moveOption}
                                 findOption={this.findOption}
                                 cancelDnD={this.cancelDnD}
                                 finishDnD={this.finishDnD}
                />
              ) ) }
            </div>) }

            { uiState.readyForOptions && !readOnly && (
              <div className="variation-item-options-footer">
                <div className="error-container">
                  <AddComboOption availableOptions={uiState.availableOptions} onAddOptions={this.onAddOptions.bind(this, uiState.availableOptions)} disabled={disableAddButton} />
                  { showError && !hasOptions && <div className="error">{validity}</div> }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  cancelDnD = () => {
    this.setState({inDnD: false, options: []});
  }

  finishDnD = () => {
    const options = this.getOptions();
    this.onChange('options', options);
  }

  moveOption = (id, atIndex) => {
    const options = this.getOptions();
    const { option, index } = this.findOption(id);
    options.splice(index, 1);
    options.splice(atIndex, 0, option);

    this.setState({options, inDnD: true});
  }

  findOption = (id) => {
    const options = this.getOptions();
    const index = _.findIndex(options, { id });

    return {
      option: options[index],
      index: index
    };
  }
}
