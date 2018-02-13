import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Combobox } from 'react-widgets';
import classNames from 'classnames';

import { validateOption } from 'global/modules/etsy/bulkEditOps/validate/variationsInventory';

import VariationOptionList from './VariationOptionList';

class AddComboOptionItem extends Component {
  static propTypes = {
    item: PropTypes.object
  };

  render() {
    const { item } = this.props;
    const classes = classNames('add-option-combo-item', { 'already-added': item.selected });

    return item.name === '-' ? (
      <div className="separator" />
    ) : (
      <div className={classes}>{item.name}</div>
    );
  }
}

export default class AddComboOption extends Component {
  static propTypes = {
    availableOptions: PropTypes.array.isRequired,
    onAddOptions: PropTypes.func.isRequired,
    optionFormatter: PropTypes.func,
    disabled: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      value: '',
      comboboxOpen: false
    };
  }

  onSelected = (value, addButtonClicked) => {
    const invalid = !value.addAll && !!validateOption(value.name);

    if (invalid && !addButtonClicked) {
      this.ignoreNextValueChangedEvent = true;
      return false;
    }

    this.setState({
      value: ''
    });

    this.ignoreNextValueChangedEvent = !addButtonClicked;

    if (value.addAll) {
      this.onAddAll();
      this.setComboboxOpenState(false);
    } else {
      const { availableOptions } = this.props;
      const newOption = availableOptions.find(option => option.name.toLowerCase() === value.name.toLowerCase()) || value;
      this.props.onAddOptions([{
        id: undefined,
        value: newOption.name,
        valueId: newOption.id,
        isAvailable: null
      }]);
    }
    return undefined;
  }

  onValueChanged = (value) => {
    if (this.ignoreNextValueChangedEvent) {
      this.ignoreNextValueChangedEvent = false;
      return;
    }

    // the combobox widget is weird. If you type in a suggested value, it doesn't send the string, it sends
    // the object that the string matched.
    const stringValue = _.isString(value) ? value : _.get(value, 'name');

    if (_.isString(stringValue)) {
      this.setState({
        value: stringValue
      });
    }
  }

  onAddAll() {
    this.props.onAddOptions(
      this.props.availableOptions
        .filter(suggestedOption => suggestedOption.selected === false)
        .map(suggestedOption => ({
          id: undefined,
          value: suggestedOption.name,
          valueId: suggestedOption.id
        }))
    );
  }

  render() {
    const { availableOptions, disabled } = this.props;
    const { value, comboboxOpen } = this.state;
    const customOptions = value && value.length > 0 ? [{ name: value }] : [];

    const allOptions = [...customOptions, ...availableOptions];

    const comboboxMessages = {
      emptyList: 'Enter a new option...'
    };

    const errorMsg = value && value.length > 0 ? validateOption(value) : null;
    const classes = classNames({
      'add-option-combo': true,
      'no-suggested-options': !availableOptions.length
    });

    // custom matcher so the combobox suggests items based on unformatted name
    const match = (item) => _.isString(item) ? item : _.get(item, 'name', '');

    const addButtonDisabled = errorMsg || _.trim(value).length === 0 || disabled;
    const addButtonClasses = classNames('add-button', { inactive: addButtonDisabled});

    return (
      <div className={classes}>
        <Combobox
          data={allOptions}
          placeholder="Add Option"
          valueField="id"
          onSelect={this.onSelected}
          value={value}
          filter={false}
          open={comboboxOpen}
          onClick={this.openCombobox}
          onFocus={this.openCombobox}
          onToggle={this.setComboboxOpenState}
          onChange={this.onValueChanged}
          className="clean"
          itemComponent={AddComboOptionItem}
          messages={comboboxMessages}
          listComponent={VariationOptionList}
          textField={match}
          disabled={disabled}
        />
        <button
          type="button"
          className={addButtonClasses}
          onClick={() => this.onSelected({name: value}, true)}
          disabled={addButtonDisabled}
        >Add</button>
        {
          errorMsg ? (
            <div className="error">{errorMsg}</div>
          ) : undefined
        }
      </div>
    );
  }

  openCombobox = () => {
    this.setState({
      comboboxOpen: true
    });
  }

  setComboboxOpenState = (state) => {
    this.setState({
      comboboxOpen: state
    });
  }
}
