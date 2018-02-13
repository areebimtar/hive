import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as Actions from '../../actions';

import enhanceWithClickOutside from '../ClickOutside';


class AccountMenu extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    visible: PropTypes.bool
  };

  render() {
    const { visible } = this.props;

    return (
      <div className="app-header-menu-item account-menu">
        <button onClick={this.toggleMenu}/>
        { visible &&
          <ul>
            <li>
              <a href="/logout">Logout</a>
            </li>
          </ul>
        }
      </div>
    );
  }

  hideMenu = () => this.props.dispatch(Actions.AccountMenu.hide())
  toggleMenu = () => this.props.dispatch(Actions.AccountMenu.toggle())

  handleClickOutside = () => this.hideMenu()
}

export default connect(state => ({
  visible: state.getIn(['accountMenu', 'visible'])
}))(
  enhanceWithClickOutside(AccountMenu)
);

