import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import classNames from 'classnames';
import { Map, List as ListImm } from 'immutable';

import InputField from './InputField';
import enhanceWithClickOutside from '../../ClickOutside';

export class List extends Component {
  static propTypes = {
    columns: PropTypes.object,
    inputComponent: PropTypes.any,
    readOnly: PropTypes.bool,
    bulk: PropTypes.bool,
    inline: PropTypes.bool,
    autofocusIndex: PropTypes.number,
    onChange: PropTypes.func,
    onClick: PropTypes.func,
    onFinish: PropTypes.func
  }

  static defaultProps = {
    columns: null,
    inputComponent: InputField,
    readOnly: true,
    bulk: true,
    inline: false,
    autofocusIndex: 0,
    onChange: _.noop,
    onClick: _.noop,
    onFinish: _.noop
  }

  onChange(index, combination, value) {
    const { onChange } = this.props;

    onChange(new Map({ index, combination, value }));
  }

  onFinish = () => {
    this.props.onFinish();
  }

  onClick = (index, event) => {
    const { onClick } = this.props;

    event.stopPropagation();
    event.preventDefault();

    onClick(index);
  }

  renderReadOnlyValue(value, formattedValue, status, index) {
    const readOnlyValue = _.isBoolean(value) ? '' : String(value);
    const readOnlyClasses = classNames('read-only-value', { 'is-true': _.isBoolean(value) && value, 'is-false': _.isBoolean(value) && !value });

    if (formattedValue) {
      return (<div className={readOnlyClasses} onClick={this.onClick.bind(this, index)}>
        <span dangerouslySetInnerHTML={ {__html: formattedValue } } />
        <div className="read-only message error">{status}</div>
      </div>);
    }

    return (<div className={readOnlyClasses} onClick={this.onClick.bind(this, index)}>
      <span className="value">{readOnlyValue}</span>
      <div className="read-only message error">{status}</div>
    </div>);
  }

  renderValueColumn(readOnly, value, formattedValue, status, changeHandler, index) {
    const { inputComponent: Input, bulk, inline, autofocusIndex } = this.props;

    const inputClasses = classNames('value-input-box', { 'is-toggle': _.isBoolean(value) });

    return (<div className="property-value-column"><div className="property-value-wrapper">
      { readOnly && this.renderReadOnlyValue(value, formattedValue, status, index) }
      { !readOnly && Input && <Input className={inputClasses} value={value} status={status} autoFocus={index === autofocusIndex} onChange={changeHandler} onFinish={this.onFinish} bulk={bulk} inline={inline} /> }
    </div></div>);
  }

  renderOptionRow(index, optionOrPermutation, readOnly) {
    const valueOnFirstProperty = optionOrPermutation.getIn(['combination', 0, 'showValue'], false);
    const valueOnSecondProperty = optionOrPermutation.getIn(['combination', 1, 'showValue'], false);
    const valueOnPermutation = optionOrPermutation.get('showValue', false);
    const rowClasses = classNames('option-row', { 'not-visible': !optionOrPermutation.get('visible', true) });

    return (<div key={index} className={rowClasses}>
      { optionOrPermutation.get('combination').map((combo, key) => <div key={key} className="property-name-column"><div className="property-name-wrapper">{combo.getIn(['option', 'label'])}</div></div>) }
      { valueOnFirstProperty && this.renderValueColumn(readOnly, optionOrPermutation.get('value'), optionOrPermutation.get('_formattedValue'), optionOrPermutation.get('status'), this.onChange.bind(this, null, optionOrPermutation.getIn(['combination', 0])), index)}
      { valueOnSecondProperty && this.renderValueColumn(readOnly, optionOrPermutation.get('value'), optionOrPermutation.get('_formattedValue'), optionOrPermutation.get('status'), this.onChange.bind(this, null, optionOrPermutation.getIn(['combination', 1])), index)}
      { valueOnPermutation && this.renderValueColumn(readOnly, optionOrPermutation.get('value'), optionOrPermutation.get('_formattedValue'), optionOrPermutation.get('status'), this.onChange.bind(this, index, null), index)}
    </div>);
  }

  render() {
    const { columns, readOnly, bulk, inline } = this.props;
    const wrapperClasses = classNames('items-wrapper', { bulk, inline });
    const showHeaders = column => column.get('headers', new ListImm([])).size !== 0;

    return (
      <div className={wrapperClasses}>
        { columns && columns.map((column, columnIdx) => (
          <div className="offering-property-item" key={columnIdx} onClick={e => e.stopPropagation()}>
            { column.get('showValue') && this.renderValueColumn(readOnly, column.get('value'), column.get('_formattedValue'), column.get('status'), this.onChange.bind(this, null, null), 0) }
            { showHeaders(column) && <div className="item-header">
                { column.get('headers', new ListImm([])).map((header, headerIdx) =>
                  <div className="property-name-column" key={headerIdx}>{header}</div>
                )}
              </div>
            }
            { !column.get('showValue') && <div className="offering-property-options">
              { column.get('items', new List([])).map((item, index) => this.renderOptionRow(index, item, readOnly)) }
            </div> }
          </div>
        ))}
      </div>
    );
  }

  handleClickOutside = () => {
    const { readOnly } = this.props;

    if (!readOnly) {
      this.props.onFinish();
    }
  }
}

export default enhanceWithClickOutside(List);
