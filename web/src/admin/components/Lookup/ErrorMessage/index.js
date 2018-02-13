import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

class ErrorMessage extends Component {
  static propTypes = {
    error: PropTypes.string.isRequired
  };

  render() {
    const { error } = this.props;
    const errorHtml = _.escape(error).replace('\n', '<br/>');
    return (
      <div>
        <span className="red-text text-darken-4">Error occurred, please reload the page</span>
        <br /><br />
        <span dangerouslySetInnerHTML={{ __html: errorHtml }} />
      </div>
    );
  }
}

export default ErrorMessage;
