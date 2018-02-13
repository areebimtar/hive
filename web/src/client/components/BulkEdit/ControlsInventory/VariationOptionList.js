import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

import List from 'react-widgets/lib/List';
import CustomPropTypes from 'react-widgets/lib/util/propTypes.js';
import ListMovementMixin from 'react-widgets/lib/mixins/ListMovementMixin';
import AriaDescendantMixin from 'react-widgets/lib/mixins/AriaDescendantMixin';

export default createReactClass({

  displayName: 'VariationOptionList',

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

  onClick(event) {
    event.stopPropagation();
    event.preventDefault();

    this.props.onSelect({ addAll: true });
  },

  render() {
    const { data} = this.props;
    const showAddAllOptionsLink = data.filter(option => !option.selected && !option.inputtedValue).length > 0;

    return (
      <div>
        <List {...this.props} />
        { showAddAllOptionsLink && <div className="add-all" onClick={this.onClick}><span className="check-icon" />Add All</div> }
      </div>
    );
  },

  _data() {
    return this.props.data;
  }
});
