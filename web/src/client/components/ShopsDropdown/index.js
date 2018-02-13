import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { Link } from 'react-router';
import { CHANNEL_NAMES } from 'global/constants';
import { SHOPS_DROPDOWN_CHANNEL_ORDER } from 'app/client/constants';
import enhanceWithClickOutside from '../ClickOutside';

class ShopsDropdown extends Component {
  static propTypes = {
    shops: PropTypes.object,
    open: PropTypes.bool,
    channelOrder: PropTypes.array.isRequired,
    onToggle: PropTypes.func,
    onChange: PropTypes.func
  }

  renderChannel(channelId) {
    const { shops, onChange } = this.props;
    const getShopClasses = shop => classNames({ selected: shop.get('_selected') });

    const channelShops = shops.filter(shop => shop.get('channel_id') === String(channelId));

    return !!channelShops.size && (
      <div key={channelId} className="channel-shops" >
        <div className="channel-name">{ _.camelCase(CHANNEL_NAMES[channelId]) }</div>
        <ul>
        { channelShops.map((shop) => (
          <li className={getShopClasses(shop)} key={ `shopId_${shop.get('id')}` } onClick={ (event) => !event.stopPropagation() && onChange(shop.get('id')) }>
            <span className="menu-item-shop">{shop.get('name')}</span>
          </li>))}
        </ul>
      </div>);
  }

  render() {
    const { shops, open, channelOrder, onToggle } = this.props;
    const selectedShop = shops.find((shop) => shop.get('_selected'));

    return (
      <div>
        <button onClick={onToggle}>
          { selectedShop && <span><span className="menu-channel">{selectedShop.get('channel')}</span><span className="menu-shop">{selectedShop.get('name')}</span></span> }
          { !selectedShop && ('Select') }
        </button>
        { open && <div className="shops-menu">
          { channelOrder.map(channelId =>
            this.renderChannel(channelId)) }
          <div className="add-shop"><Link to="/welcome">Add Shop</Link></div>
        </div> }
      </div>
    );
  }

  handleClickOutside = () => this.props.open && this.props.onToggle()
}

export default connect(() => {
  return { channelOrder: SHOPS_DROPDOWN_CHANNEL_ORDER };
})(enhanceWithClickOutside(ShopsDropdown));
