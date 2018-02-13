import React, { Component } from 'react';

import AccountMenu from '../AccountMenu';

export default class Header extends Component {
  render() {
    return (
      <div className="app-header">
        <div className="app-header-logo">
          <span className="logo" />
        </div>
        <div className="app-header-user">
          <div className="app-header-menu-item">
            <a href="http://help.getvela.com" className="help-page-icon" target="_blank" />
          </div>
          <AccountMenu />
        </div>
      </div>
    );
  }
}
