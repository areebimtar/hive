import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';

import classNames from 'classnames';

import * as Actions from '../actions';
import * as CONSTANTS from '../constants';
import ContactLink from './ContactLink';

@connect(reduction => ({
  inProgress: reduction.getIn(['login', 'inProgress']),
  errorMsg: reduction.getIn(['login', 'errorMsg']),
  loginState: reduction.getIn(['login', 'loginState']),
  welcomeUrl: _.get(reduction.get('config'), 'welcomeUrl', '/')
}))
export default class HomePage extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    children: PropTypes.object,
    loginState: PropTypes.string,
    inProgress: PropTypes.bool,
    errorMsg: PropTypes.string,
    welcomeUrl: PropTypes.string
  };

  render() {
    const { loginState, errorMsg, children, inProgress: disabled, welcomeUrl } = this.props;

    const signInClasses = classNames({active: loginState === CONSTANTS.SIGN_IN});
    const createAccountClasses = classNames({active: loginState === CONSTANTS.CREATE_ACCOUNT});
    return (
      <div className="special-page">
        <a href={welcomeUrl} className="logo-link" />
        <div className="tabs">
          <a href="#" className={signInClasses} onClick={this.setSignInState.bind(this)} >Sign In</a>
          <a href="#" className={createAccountClasses} onClick={this.setCreateAccountState.bind(this)} >Create Account</a>
        </div>
        { children && React.cloneElement(children, {disabled}) }
        { errorMsg && <div className="error">{errorMsg}</div> }
        <ContactLink className="contact" text="Contact Us" dispatch={this.props.dispatch} />
      </div>
    );
  }

  setSignInState(e) {
    e.preventDefault();
    this.props.dispatch(Actions.Application.changeRoute('/login'));
  }

  setCreateAccountState(e) {
    e.preventDefault();
    this.props.dispatch(Actions.Application.changeRoute('/createAccount'));
  }
}
