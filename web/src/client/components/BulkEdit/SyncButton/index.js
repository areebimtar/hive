import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';


class CloseButton extends Component {
  static propTypes = {
    onClick: PropTypes.func.isRequired,
    show: PropTypes.bool,
    inProgress: PropTypes.bool
  };

  render() {
    const { onClick, show, inProgress } = this.props;
    const classes = classNames({'bulk-edit-sync-button': true, 'action-button': true, inactive: !show, inprogress: inProgress});

    return (<button className={classes} onClick={onClick} disabled={!show}><span>Sync Updates</span></button>);
  }
}

export default connect()(CloseButton);
