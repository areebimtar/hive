import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

import List from 'react-widgets/lib/List';
import CustomPropTypes from 'react-widgets/lib/util/propTypes.js';
import ListMovementMixin from 'react-widgets/lib/mixins/ListMovementMixin';
import AriaDescendantMixin from 'react-widgets/lib/mixins/AriaDescendantMixin';

import AddNewForm from './AddNewForm';

export default (isAddNewVisible, validateInput, placeholder) => createReactClass({

  displayName: 'SectionList',

  propTypes: {
    data: PropTypes.array,
    onSelect: PropTypes.func,
    onMove: PropTypes.func,

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
    const { data, onSelect } = this.props;

    return (
      <div>
        <List {...this.props} />
        { isAddNewVisible(data) && <AddNewForm onApply={onSelect} validate={validateInput} placeholder={placeholder} /> }
      </div>
    );
  },

  _data() {
    return this.props.data;
  }
});
