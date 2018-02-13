import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';

import { DETAIL_DATE_FORMAT } from '../../../constants/other';

class ShopMainData extends Component {
  static propTypes = {
    shop: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    // Define which properties from shop to show and specify their titles
    this.shopProps = [
      { title: 'Id', key: 'id' },
      { title: 'Channel id', key: 'channel_shop_id' },
      { title: 'Sync status', key: 'sync_status' },
      { title: 'Last sync timestamp', key: 'last_sync_timestamp',
        renderer: content => moment(content).format(DETAIL_DATE_FORMAT)
      },
      {
        title: 'Invalid', key: 'invalid',
        renderer: content => {
          if (content) {
            return <span className="red-text text-darken-2">true</span>;
          } else {
            return <span className="teal-text text-darken-1">false</span>;
          }
        }
      },
      {
        title: 'Error', key: 'error',
        renderer: content => {
          return <span className="red-text text-darken-2">{content}</span>;
        }
      },
      {
        renderer: shop => {
          return [
            (<div key="1" className="row">
              <div className="col s4">
                Applying
                </div>
              <div className="col s4">
                To apply
                </div>
              <div className="col s4">
                Applied
                </div>
            </div>),
            (<div key="2" className="row">
              <div className="col s4">
                {shop.applying_operations ? 'true' : 'false'}
              </div>
              <div className="col s4">
                {shop.to_apply}
              </div>
              <div className="col s4">
                {shop.applied}
              </div>
            </div>)
          ];
        }
      }
    ];
  }

  renderValueRow(index, { title, key, renderer}, shop) {
    const valueElementId = `shop-detail-${key}`;
    return (
      <li key={index} className="collection-item">
        <div className="row">
          <div className="col s4">
            {title}
          </div>
          <div className="col s8" id={valueElementId}>
            {renderer ? renderer(shop[key], key) : shop[key]}
          </div>
        </div>
      </li>
    );
  }

  renderCustomRow(index, { renderer }, shop) {
    return (
      <li key={index} className="collection-item">
        {renderer(shop)}
      </li>
    );
  }

  render() {
    const { shop } = this.props;
    return (
      <div className="card">
        <div className="card-content">
          <div className="card-title detail-card-title">
            <span className="shop-detail-name">{shop.name}</span>
          </div>
          <ul className="collection with borderless">
            {this.shopProps.map((rowProps, index) => {
              if (rowProps.key) {
                return this.renderValueRow(index, rowProps, shop);
              } else {
                return this.renderCustomRow(index, rowProps, shop);
              }
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default ShopMainData;
