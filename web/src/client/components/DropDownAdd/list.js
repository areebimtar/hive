import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

import List from 'react-widgets/lib/List';
import CustomPropTypes from 'react-widgets/lib/util/propTypes.js';
import ListMovementMixin from 'react-widgets/lib/mixins/ListMovementMixin';
import AriaDescendantMixin from 'react-widgets/lib/mixins/AriaDescendantMixin';

import AddNewForm from './addNewForm';

export default createReactClass({

  displayName: 'DropDownAdd',

  propTypes: {
    data: PropTypes.array,
    onSelect: PropTypes.func,
    onMove: PropTypes.func,

    onAddItem: PropTypes.func,
    validate: PropTypes.func,
    addPlaceholder: PropTypes.string,

    optionComponent: CustomPropTypes.elementType,
    itemComponent: CustomPropTypes.elementType,

    selected: PropTypes.any,
    focused: PropTypes.any,
    valueField: CustomPropTypes.accessor,
    textField: CustomPropTypes.accessor,

    disabled: CustomPropTypes.disabled.acceptsArray,
    readOnly: CustomPropTypes.readOnly.acceptsArray,

    messages: PropTypes.shape({
      emptyList: CustomPropTypes.message
    })
  },

  mixins: [
    ListMovementMixin,
    AriaDescendantMixin()
  ],

  render() {
    const { data, onSelect, validate, onAddItem, addPlaceholder } = this.props;
    const showAddNew = data;

    const propsForAddNewForm = ['addPlaceholder', 'validate', 'onAddItem'];
    const propObjectForList = {};
    Object.keys(this.props).forEach(propName => {
      if (!propsForAddNewForm.includes(propName)) {
        propObjectForList[propName] = this.props[propName];
      }
    });

    return (
      <div>
        <List {...propObjectForList} />
        { showAddNew && <AddNewForm onApply={onSelect} onAddItem={onAddItem || _.noop } validate={validate} placeholder={addPlaceholder} /> }
      </div>
    );
  },

  _data() {
    return this.props.data;
  }
});
