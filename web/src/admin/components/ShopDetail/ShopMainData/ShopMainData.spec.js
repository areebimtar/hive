import React from 'react';
import { shallow } from 'enzyme';
import {expect} from 'chai';
import _ from 'lodash';
import moment from 'moment-timezone';

import ShopMainData from './index';

describe('ShopMainData', () => {
  const shopPropertiesToCssSelectors = {
    name: '.shop-detail-name',
    id: '#shop-detail-id',
    channel_shop_id: '#shop-detail-channel_shop_id',
    sync_status: '#shop-detail-sync_status',
    last_sync_timestamp: '#shop-detail-last_sync_timestamp',
    invalid: '#shop-detail-invalid',
    error: '#shop-detail-error'
  };

  it('renders proper data #1', () => {
    const shop = {
      name: 'Shop-name',
      id: 1,
      channel_shop_id: 5,
      sync_status: 'Sync status',
      invalid: true,
      error: 'Bad things happened'
    };
    const el = shallow(<ShopMainData shop={shop} />);
    _.forOwn(shop, (value, key) => {
      const cssSelector = shopPropertiesToCssSelectors[key];
      expect(el.find(cssSelector).text()).to.eql(value.toString());
    });
  });

  it('renders proper data #2', () => {
    const shop = {
      name: 'Shop-name',
      id: 1,
      channel_shop_id: 5,
      sync_status: 'Sync status',
      invalid: 'true'
    };
    const el = shallow(<ShopMainData shop={shop} />);
    _.forOwn(shop, (value, key) => {
      const cssSelector = shopPropertiesToCssSelectors[key];
      expect(el.find(cssSelector).text()).to.eql(value.toString());
    });
  });

  it('properly renders and formats last_sync_timestamp', () => {
    const shop = {
      last_sync_timestamp: '2017-06-22T11:50:18.119Z'
    };
    const el = shallow(<ShopMainData shop={shop} />);
    _.forOwn(shop, (value, key) => {
      const cssSelector = shopPropertiesToCssSelectors[key];
      expect(el.find(cssSelector).text()).to.eql(moment(value).format('lll'));
    });
  });
});
