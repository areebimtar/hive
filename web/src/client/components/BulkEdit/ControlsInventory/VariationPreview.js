import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

export default class VariationPreview extends Component {
  static propTypes = {
    variation: PropTypes.object,
    onClick: PropTypes.func
  };

  static defaultProps = {
    variation: {},
    onClick: _.noop
  };

  render() {
    const { variation, onClick } = this.props;

    return (
       <div className="settings-and-delete-wrapper">
        <div className="variation-item-settings">
          <div className="setting property">
            <div className="value">
              <div className="rw-dropdownlist rw-widget rw-state-disabled" onClick={onClick}>
                <div className="rw-input">{variation.propertyName}</div>
              </div>
            </div>
          </div>
          {
            !!variation.scaleName &&
              <div className="setting scale">
                <div className="value">
                  <div className="rw-dropdownlist rw-widget rw-state-disabled" onClick={onClick}>
                    <div className="rw-input">{variation.scaleName}</div>
                  </div>
                </div>
              </div>
          }
        </div>
      </div>
    );
  }
}
