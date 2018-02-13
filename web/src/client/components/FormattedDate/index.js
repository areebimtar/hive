import moment from 'moment';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';


export class FormattedDate extends Component {
  static propTypes = {
    date: PropTypes.string.isRequired,
    format: PropTypes.string
  }

  render() {
    const { date, format } = this.props;
    return (<span>{moment.unix(date).format(format || 'MMM DD, YYYY')}</span>);
  }
}

export default connect()(FormattedDate);
