import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';


const getButtonMessage = (selected) => {
  if (selected) {
    const plural = selected > 1 ? 's' : '';
    return `Edit ${selected} Listing${plural}`;
  }
  return 'Edit';
};

export class EditListingsButton extends Component {
  static propTypes = {
    selected: PropTypes.number,
    onClick: PropTypes.func
  }

  render() {
    const { selected, onClick } = this.props;
    const clases = classNames({ 'action-button': true, inactive: !selected });
    const message = getButtonMessage(selected);

    return (
      <button className={clases} disabled={!selected} onClick={onClick}>{message}</button>
    );
  }
}

export default connect()(EditListingsButton);
