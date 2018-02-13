import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../actions';
import ShopMainData from '../../components/ShopDetail/ShopMainData';
import ShopOwners from '../../components/ShopDetail/ShopOwners';
import ShopProductsSummary from '../../components/ShopDetail/ShopProductsSummary';
import Spinner from '../../components/Spinner';
import Separator from '../../components/Separator';
import DeleteShopButton from '../../components/ShopDetail/DeleteShopButton';
import SyncShopButton from '../../components/ShopDetail/SyncShopButton';
import ReassignShopFlow from '../ReassignShopFlow';

class ShopDetail extends Component {
  static propTypes = {
    routeParams: PropTypes.object.isRequired,
    getShopDetail: PropTypes.func.isRequired,
    clearShopDetail: PropTypes.func.isRequired,
    openUserDetail: PropTypes.func.isRequired,
    syncShop: PropTypes.func.isRequired,
    deleteShop: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    shop: PropTypes.object,
    owners: PropTypes.array,
    productsStateCounts: PropTypes.object,
    error: PropTypes.string,
    syncInProgress: PropTypes.bool.isRequired
  }

  componentWillMount() {
    const shopId = this.props.routeParams.shopId;
    this.props.getShopDetail(shopId);
  }

  componentWillUnmount() {
    this.props.clearShopDetail();
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

  renderContent() {
    const {
      openUserDetail, deleteShop, syncShop,
      shop, owners, productsStateCounts, syncInProgress
    } = this.props;
    const nonNullProductsStateCounts = productsStateCounts || {};
    return (
      <div>
        <div className="controls-bar">
          <SyncShopButton syncShop={syncShop}
            enabled={!syncInProgress} inProgress={syncInProgress} />
          <Separator />
          <ReassignShopFlow shop={shop} />
          <Separator />
          <DeleteShopButton deleteShop={deleteShop} />
        </div>
        <ShopMainData shop={shop} />
        <div className="row">
          <div className="col s6">
            <ShopProductsSummary productsStateCounts={nonNullProductsStateCounts} />
          </div>
          <div className="col s6">
            <ShopOwners owners={owners} openUserDetail={openUserDetail} />
          </div>
        </div>
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
    const {
      loading, shop, owners, error
    } = this.props;
    if (error) {
      return this.renderError();
    } else if (shop && owners) {
      return this.renderContent();
    } else if (loading) {
      return this.renderProgressSpinner();
    } else {
      return <div className="red-text text-darken-4">Unknown error occurred</div>;
    }
  }
}

const mapStateToProps = state => {
  const shop = state.getIn(['shopDetail', 'shop']);
  const owners = state.getIn(['shopDetail', 'owners']);
  const productsStateCounts = state.getIn(['shopDetail', 'productsStateCounts']);
  return {
    loading: state.getIn(['shopDetail', 'loading']),
    shop: shop ? shop.toJS() : undefined,
    owners: owners ? owners.toJS() : undefined,
    productsStateCounts: productsStateCounts ? productsStateCounts.toJS() : undefined,
    error: state.getIn(['shopDetail', 'error']),
    syncInProgress: state.getIn(['shopDetail', 'syncInProgress'])
  };
};

const mapDispatchToProps = dispatch => ({
  getShopDetail: shopId => dispatch(Actions.ShopDetail.getShopDetail(shopId)),
  clearShopDetail: () => dispatch(Actions.ShopDetail.clearShopDetail()),
  openUserDetail: userId => dispatch(Actions.Application.changeRoute(`/admin/users/${userId}`)),
  syncShop: () => dispatch(Actions.ShopDetail.syncShop()),
  deleteShop: () => dispatch(Actions.ShopDetail.deleteShop())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ShopDetail);
