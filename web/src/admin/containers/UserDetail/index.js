import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import _ from 'lodash';

import * as Actions from '../../actions';
import UserMainData from '../../components/UserDetail/UserMainData';
import UserShops from '../../components/UserDetail/UserShops';
import Spinner from '../../components/Spinner';
import ImpersonateUserFlow from '../../components/UserDetail/ImpersonateUserFlow';

class UserDetail extends Component {
  static propTypes = {
    routeParams: PropTypes.object.isRequired,
    getUserDetail: PropTypes.func.isRequired,
    clearUserDetail: PropTypes.func.isRequired,
    openShopDetail: PropTypes.func.isRequired,
    impersonateUser: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    user: PropTypes.object,
    shops: PropTypes.array,
    impersonating: PropTypes.bool.isRequired,
    userInfo: PropTypes.object.isRequired,
    error: PropTypes.string
  }

  componentWillMount() {
    const userId = this.props.routeParams.userId;
    this.props.getUserDetail(userId);
  }

  componentWillUnmount() {
    this.props.clearUserDetail();
  }

  renderProgressSpinner() {
    return (
      <div>
        <div className="center" >
          <Spinner />
        </div>
      </div>
    );
  }

  renderImpersonationFlow() {
    const { userInfo, impersonating, impersonateUser, user } = this.props;
    const isHimself = userInfo.id && userInfo.id === user.id;
    if (impersonating || isHimself) {
      return undefined;
    } else {
      return (
        <div className="controls-bar">
          <ImpersonateUserFlow user={user} impersonateUser={impersonateUser} />
        </div>
      );
    }
  }

  renderContent() {
    const { openShopDetail, user, shops } = this.props;
    return (
      <div>
        {this.renderImpersonationFlow()}
        <UserMainData user={user} />
        <UserShops shops={shops}
          openShopDetail={openShopDetail} />
      </div>
    );
  }

  renderError() {
    const { error } = this.props;
    const errorHtml = _.escape(error).replace('\n', '<br/>');
    return (
      <div>
        <span className="red-text text-darken-4">Error occurred</span>
        <br /><br />
        <span dangerouslySetInnerHTML={{ __html: errorHtml }} />
      </div>
    );
  }

  render() {
    const { loading, user, shops, error } = this.props;
    if (error) {
      return this.renderError();
    } else if (user && shops) {
      return this.renderContent();
    } else if (loading) {
      return this.renderProgressSpinner();
    } else {
      return <div className="red-text text-darken-4">Unknown error occurred</div>;
    }
  }
}

const mapStateToProps = state => {
  const user = state.getIn(['userDetail', 'user']);
  const shops = state.getIn(['userDetail', 'shops']);
  const userInfo = state.get('userInfo');
  return {
    loading: state.getIn(['userDetail', 'loading']),
    user: user ? user.toJS() : null,
    shops: shops ? shops.toJS() : null,
    impersonating: state.getIn(['impersonation', 'impersonating'], false),
    userInfo: userInfo ? userInfo.toJS() : {},
    error: state.getIn(['userDetail', 'error'])
  };
};

const mapDispatchToProps = dispatch => ({
  getUserDetail: userId => dispatch(Actions.UserDetail.getUserDetail(userId)),
  clearUserDetail: () => dispatch(Actions.UserDetail.clearUserDetail()),
  impersonateUser: () => dispatch(Actions.UserDetail.impersonateUser()),
  openShopDetail: shopId => dispatch(Actions.Application.changeRoute(`/admin/shops/${shopId}`))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserDetail);
