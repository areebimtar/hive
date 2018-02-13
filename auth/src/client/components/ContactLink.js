import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../actions';

// Component show link to support mail with optional text (default is support email address).
@connect(() => ({}))
export default class ContactLink extends Component {
  static propTypes = {
    text: PropTypes.string,
    className: PropTypes.string,
    dispatch: PropTypes.func.isRequired
  };

  render() {
    const linkText = this.props.text;

    return (
      <a href="#" onClick={this.triggerIntercomConversation.bind(this)} className={this.props.className}> {linkText}</a>
    );
  }

  triggerIntercomConversation(e) {
    e.preventDefault();
    this.props.dispatch(Actions.IntercomActions.startConversation());
  }

}
