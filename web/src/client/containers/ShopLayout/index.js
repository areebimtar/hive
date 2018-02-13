import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as Actions from '../../actions';
import {Filters, IntroVideoModal, ShopsDropdown, SyncStatus} from '../../components';
import { SHOP_SYNC_STATUS_INITIAL_SYNC } from 'global/db/models/constants';

import { CHANNEL } from 'global/constants';

const CHANNEL_NAME_TO_ID_MAP = {
  etsy: CHANNEL.ETSY,
  shopify: CHANNEL.SHOPIFY
};

class ShopLayout extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    children: PropTypes.object.isRequired,
    params: PropTypes.shape({
      shopId: PropTypes.string
    }),
    route: PropTypes.object,
    data: PropTypes.object.isRequired,
    userProfile: PropTypes.object,
    dropdownOptions: PropTypes.object,
    products: PropTypes.object,
    shopsMap: PropTypes.object
  };

  componentWillMount() {
    const { shopId } = this.props.params;
    const { path } = this.props.route;
    // set shopId
    this.props.dispatch(Actions.Shops.setShopId({shopId, channelId: CHANNEL_NAME_TO_ID_MAP[path], force: true}));
  }

  componentWillReceiveProps(nextProps) {
    const { shopId: nextShopId } = nextProps.params;
    const { shopId: currentShopId } = this.props.params;

    // set shopId if new shopId is different from old one
    if (currentShopId === nextShopId) { return; }
    const { path } = nextProps.route;
    this.props.dispatch(Actions.Shops.setShopId({shopId: nextShopId, channelId: CHANNEL_NAME_TO_ID_MAP[path]}));
  }

  render() {
    const { shopId } = this.props.params;
    const { children, data, dropdownOptions, products, shopsMap } = this.props;
    const shop = shopsMap && shopsMap.get(shopId);
    const initialSync = shop && (shop.get('sync_status') === SHOP_SYNC_STATUS_INITIAL_SYNC || !shop.get('sync_status'));
    const invalidShop = !!shop && !!shop.get('invalid');
    // TODO: Justin will provide updated video, until hide current video
    const modalIsOpen = false; // !invalidShop && (userProfile.introVideoModalOpen !== 'false');

    return (
      <div>
        <app-sidebar>
          <app-sidebar--menu>
            <ShopsDropdown shops={dropdownOptions} open={data.dropdown.open} onChange={this.navigateToShop} onToggle={this.toggleDropdown} />
          </app-sidebar--menu>
          <app-sidebar--filter>
            { !initialSync && !invalidShop && <Filters filters={data.productsFilters} magicOptions={data.magicOptions} /> }
          </app-sidebar--filter>
          <div className="sync-main">
            <SyncStatus />
          </div>
        </app-sidebar>
        <app-dashboard>
          { children && React.cloneElement(children, { data, products, shop, initialSync }) }
          <IntroVideoModal open={modalIsOpen} onClose={this.closeIntroVideoModal} />
        </app-dashboard>
      </div>
    );
  }

  toggleDropdown = () => this.props.dispatch(Actions.Shops.toggleDropdown())
  navigateToShop = (shopId) => this.props.dispatch(Actions.Shops.navigateToShop(shopId))
  closeIntroVideoModal = () => this.props.dispatch(Actions.Shops.closeIntroVideoModal())
}

export default connect(state => ({
  data: state.getIn(['shopView']).toJS(),
  userProfile: state.getIn(['userProfile']).toJS(),
  dropdownOptions: state.getIn(['shops', 'options']),
  products: state.getIn(['shopView', 'products']),
  shopsMap: state.getIn(['shops', 'shopsById'])
}))(ShopLayout);
