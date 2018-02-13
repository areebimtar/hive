import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { navigationOnClickHandlerCreator } from '../../../utils';
import ResultsTable from '../../Lookup/ResultsTable';

class UserShops extends Component {
  static propTypes = {
    shops: PropTypes.array.isRequired,
    openShopDetail: PropTypes.func.isRequired
  };

  onShopClicked = navigationOnClickHandlerCreator(
    (event, shopId) => this.props.openShopDetail(shopId),
    (event, shopId) => `/admin/shops/${shopId}`);

  renderContent() {
    const { shops } = this.props;
    if (shops.length > 0) {
      const rows = shops.map(shop => {
        let status = null;
        if (shop.error) {
          status = <i className="material-icons red-text text-lighten-1">error</i>;
        } else {
          status = <i className="material-icons teal-text text-lighten-1">check_circle</i>;
        }

        return {
          id: shop.id,
          channelShopId: shop.channel_shop_id,
          name: shop.name,
          status
        };
      });
      return (
        <ResultsTable
          headers={UserShops.TABLE_HEADERS}
          columnKeys={UserShops.TABLE_COLUMN_KEYS}
          rows={rows}
          onResultClick={this.onShopClicked} />
      );
    } else {
      return (
        <div>
          User has no shops
        </div>
      );
    }
  }

  render() {
    return (
      <div className="card">
        <div className="card-content">
          <span className="card-title">Shops</span>
          {this.renderContent()}
        </div>
      </div>
    );
  }

  static TABLE_HEADERS = ['Vela id', 'Etsy id', 'Name', 'Status'];
  static TABLE_COLUMN_KEYS = ['id', 'channelShopId', 'name', 'status'];
}

export default UserShops;
