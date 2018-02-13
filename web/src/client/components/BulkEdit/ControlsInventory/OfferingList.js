import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Map, List as ListImm } from 'immutable';

import InputField from './InputField';
import List from './List';

import { updateVariationsCheckboxes } from 'global/modules/etsy/bulkEditOps/inventoryUtils';

export default class OfferingList extends Component {
  static propTypes = {
    op: PropTypes.object,
    inputComponent: PropTypes.any,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    onChange: PropTypes.func,
    listType: PropTypes.string
  };

  static defaultProps = {
    op: null,
    inputComponent: InputField,
    readOnly: false,
    bulk: false,
    inline: false,
    onChange: _.noop,
    listType: 'undefined'
  }

  onClickIndividualCheckbox(index) {
    const { op, onChange } = this.props;
    const value = op.getIn(['meta', 'offeringsData'], new Map());
    const variations = value.get('variations');
    const offerings = value.get('offerings');
    const type = value.get('type');
    const influencesType = value.get('influencesType');

    const checked = !variations.getIn([index, influencesType], false);

    onChange(op
      .setIn(['value', 'variations'], updateVariationsCheckboxes(variations, index, influencesType, checked))
      .setIn(['value', 'offerings'], !checked ? offerings.map(offering => offering.set(type, null)) : offerings));
  }

  onGlobalChange = (event) => {
    const inputValue = event.target.value;
    const { op, onChange } = this.props;
    const value = op.getIn(['meta', 'offeringsData'], new Map());
    const offerings = value.get('offerings');
    const type = value.get('type');

    onChange(op.setIn(['value', 'offerings'], offerings.map(offering => offering.set(type, inputValue))));
  }

  onCombinationChange(data) {
    const { op, onChange } = this.props;
    const value = op.getIn(['meta', 'offeringsData'], new Map());
    const type = value.get('type');

    onChange(op.updateIn(['value', 'offerings'], offerings => offerings.setIn([data.get('index'), type], data.get('value'))));
  }

  onSinglePropertyChange(data) {
    const { op, onChange } = this.props;
    const value = op.getIn(['meta', 'offeringsData'], new Map());
    const offerings = value.get('offerings', new List());
    const type = value.get('type');

    // change value on all offerings
    const newValue = offerings.map(offering => {
      const hasOption = offering.get('variationOptions').find(option => option.get('variationId') === data.getIn(['combination', 'variationId']) && option.get('optionId') === data.getIn(['combination', 'optionId']));
      return hasOption ? offering.set(type, data.get('value')) : offering;
    });

    onChange(op.setIn(['value', 'offerings'], newValue));
  }

  onChange = (data) => {
    const { op } = this.props;
    const value = op.getIn(['meta', 'offeringsData'], new Map());
    const variations = value.get('variations', new ListImm());
    const numOfInfluences = value.get('numOfInfluences', 0);

    const allModifies = numOfInfluences === variations.size;

    if (!allModifies) {
      return this.onSinglePropertyChange(data);
    }

    return this.onCombinationChange(data);
  }

  renderGlobalOrIndividual(checkboxData, readOnly, index) {
    if (!checkboxData || checkboxData.isEmpty()) {
      return null;
    }
    const label = readOnly && !checkboxData.get('checked') ? 'Global ' + checkboxData.get('label') : 'Individual ' + checkboxData.get('label');
    if (readOnly) {
      return <span>{label}</span>;
    } else {
      const wrapperClasses = classNames('check-box-wrapper', { 'check-box-right': index === 1 });
      const checkboxClasses = classNames('check-box', { checked: checkboxData.get('checked') });
      const onClickFn = readOnly ? _.noop : this.onClickIndividualCheckbox.bind(this, index);
      return (
        <div className={wrapperClasses} onClick={onClickFn}>
          <div className={checkboxClasses} />
          <div className="label">{label}</div>
        </div>);
    }
  }

  render() {
    const { op, inputComponent, readOnly, bulk, inline, listType } = this.props;
    const value = op.getIn(['meta', 'offeringsData'], new Map());
    const secondProperty = op.getIn(['value', 'variations', 1, 'propertyId'], null);

    const showGlobalValue = value.get('showGlobalValue');
    const globalValue = value.get('globalValue');
    const globalStatus = value.get('globalStatus');
    const globalValueStatus = value.get('globalValueStatus');
    const globalValueLabel = value.get('globalValueLabel');
    const checkboxes = value.get('checkboxes', new ListImm());
    const columns = value.get('columns', new ListImm());
    const mergedColumns = secondProperty && columns.size === 1;
    const listClasses = classNames('offering-list', listType, { 'merged-columns': mergedColumns, 'read-only': readOnly, 'no-second-property': !secondProperty });
    const listErrorMessage = showGlobalValue ? null : globalStatus;
    const showError = bulk || inline;
    const statusMsg = op.getIn(['meta', 'statuses', 'data', 0, 'data', 'status']);
    const showStatusMsg = (inline || (bulk && !readOnly)) && statusMsg;

    return (
      <div>
        <div className={listClasses}>
          <div className="header-bar">
            <div className="left-header">
              { this.renderGlobalOrIndividual(checkboxes.get(0), readOnly, 0) }
              { showStatusMsg && <div className="global error">{statusMsg}</div> }
              { showGlobalValue &&
                <div className="global-value left-label">
                  { !bulk && <span>{globalValueLabel}</span> }
                  { (!bulk && !readOnly) && <input className="value-input-box" id="globalValue" value={globalValue} onChange={this.onGlobalChange} /> }
                  { readOnly && <span className="global-value-text">{globalValue}</span> }
                  { showError && <div className="message error">{globalValueStatus}</div> }
                </div>
              }
            </div>
            <div className="right-header">
              { this.renderGlobalOrIndividual(checkboxes.get(1), readOnly, 1) }
            </div>
            { showError && <div className="error global">{listErrorMessage}</div> }
          </div>
          <List columns={columns} inputComponent={inputComponent} readOnly={readOnly} bulk={bulk} inline={inline} onChange={this.onChange} />
        </div>
      </div>
    );
  }
}
