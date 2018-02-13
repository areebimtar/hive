import React, { Component } from 'react';
import PropTypes from 'prop-types';

const msgFrmter = value => `Editing ${value}`;

export default class EditingCounter extends Component {
  static propTypes = {
    count: PropTypes.number
  }

  render() {
    const { count } = this.props;

    const message = msgFrmter(count);
    return (
      <div>
        {!!count && message}
      </div>
    );
  }
}
