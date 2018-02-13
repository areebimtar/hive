import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { List } from 'immutable';
import enhanceWithClickOutside from '../ClickOutside';
import classNames from 'classnames';

export class Dropdown extends Component {
  static propTypes = {
    data: PropTypes.object,
    valueField: PropTypes.string,
    textField: PropTypes.string,
    selectionText: PropTypes.string,
    readOnly: PropTypes.bool,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    className: PropTypes.string,
    onChange: PropTypes.func,
    errorText: PropTypes.string
  }

  static defaultProps = {
    data: new List(),
    valueField: 'id',
    textField: 'value',
    selectionText: 'Choose',
    readOnly: false,
    onChange: _.noop,
    className: '',
    value: null,
    errorText: null
  }

  constructor() {
    super();
    this.state = { open: false };
  }

  onToggle = () => !this.props.readOnly && this.setState({ open: !this.state.open })

  onSelectValue(value) {
    this.props.onChange(value);
    this.setState({ open: false });
  }

  getValue = (option) => {
    const { valueField } = this.props;
    return option.get(valueField);
  }

  getText = (option) => {
    const { textField } = this.props;
    return option.get(textField);
  }

  renderValues() {
    const { data, value } = this.props;
    const getClasses = (option) => classNames({ selected: this.compareValues(this.getValue(option), value) }); // eslint-disable-line
    const { open } = this.state;

    if (!open) { return null; }

    return (
      <div className="bulk-edit-dropdown">
        <ul>
          { data.map(option =>
            <li key={this.getValue(option)} className={getClasses(option)} onClick={() => this.onSelectValue(this.getValue(option))} title={this.getText(option)}>{this.getText(option)}</li>) }
        </ul>
      </div>
    );
  }

  render() {
    const { data, value, selectionText, className, readOnly, errorText } = this.props;
    const option = data.find(item => this.compareValues(this.getValue(item), value));
    const optionValue = option ? this.getText(option) : selectionText;
    const classes = classNames('bulk-edit-dropdown-item', { 'read-only': readOnly });
    const dropdownClasses = classNames('bulk-edit-dropdown-parent', className);

    return (
      <span className={classes} onClick={event => event.stopPropagation()}>
        <div className={dropdownClasses} onClick={this.onToggle} title={optionValue}>
          <span>{optionValue}</span>
          <div className="error tooltip right">{errorText}</div>
        </div>
        { this.renderValues() }
      </span>
    );
  }

  compareValues(left, right) {
    // ignore type (string vs number inconsistency)
    return left == right; // eslint-disable-line
  }

  handleClickOutside = () => this.setState({ open: false })
}

export default enhanceWithClickOutside(Dropdown);
