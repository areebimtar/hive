import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

class SyncShopButton extends Component {
  static propTypes = {
    enabled: PropTypes.bool.isRequired,
    inProgress: PropTypes.bool.isRequired,
    syncShop: PropTypes.func.isRequired
  }

  static defaultProps = {
    enabled: true,
    inProgress: false
  };

  render() {
    const { enabled, inProgress, syncShop } = this.props;
    const classesButton = classNames(
      'waves-effect', 'waves-light', 'btn', 'blue', 'lighten-2',
      { disabled: !enabled }
    );
    const classesIcon = classNames(
      'material-icons left',
      { rotating: inProgress }
    );
    return (
      <a className={classesButton}
        onClick={syncShop}>
        <i className={classesIcon}>sync</i>
        Synchronize
      </a>
    );
  }
}

export default SyncShopButton;
