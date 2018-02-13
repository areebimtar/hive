import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router';

import * as Actions from '../../actions';

import ImpersonationCard from '../../components/ImpersonationCard';

class Admin extends Component {
  static propTypes = {
    children: PropTypes.object.isRequired,
    impersonating: PropTypes.bool.isRequired,
    imporsonatedUserEmail: PropTypes.string.isRequired,
    stopImpersonating: PropTypes.func.isRequired
  }

  static defaultProps = {
    imporsonatedUserEmail: ''
  }

  renderImpersonation() {
    const { impersonating, imporsonatedUserEmail, stopImpersonating } = this.props;
    if (!impersonating) {
      return undefined;
    } else {
      return (
        <ImpersonationCard
          imporsonatedUserEmail={imporsonatedUserEmail}
          stopImpersonating={stopImpersonating} />
      );
    }
  }

  render() {
    const { children } = this.props;
    return (
      <div>
        <nav className="grey darken-2">
          <div className="nav-wrapper container">
            <Link to="/admin"
              className="brand-logo app-name">
              <span className="brand">VELA</span> admin
            </Link>
            <ul id="nav-mobile" className="right hide-on-med-and-down">
              <li><Link to="/admin/users">Users</Link></li>
              <li><Link to="/admin/shops">Shops</Link></li>
            </ul>
          </div>
        </nav>
        <div className="container">
          <br/>
          {this.renderImpersonation()}
          {children && React.cloneElement(children)}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  impersonating: state.getIn(['impersonation', 'impersonating'], false),
  imporsonatedUserEmail: state.getIn(['impersonation', 'email'])
});

const mapDispatchToProps = (dispatch) => ({
  stopImpersonating: () => dispatch(Actions.Application.stopImpersonating())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Admin);
