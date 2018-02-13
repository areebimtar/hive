import React from 'react';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';

import {
  Shops,
  InitialLoading,
  ShopLayout,
  BulkEdit,
  NotFound,
  NoShops,
  AddShop,
  AddShopifyShop
} from './containers';

import {
  EtsyDashboard,
  ShopifyDashboard
} from './components';

function navigateTo(url) {
  window.location = url;
}

export default (/* props */) =>
  <Router history={browserHistory}>
    <Route path="/" component={Shops}>
      <IndexRoute component={InitialLoading} />
      <Route path="etsy" component={ShopLayout}>
        <Route path=":shopId" component={EtsyDashboard} />
      </Route>
      <Route path="shopify" component={ShopLayout}>
        <Route path=":shopId" component={ShopifyDashboard} />
      </Route>
      <Route path="edit/:channelName" component={BulkEdit} />
      <Route path="welcome" component={NoShops}>
        <IndexRoute component={AddShop} />
        <Route path="etsy" onEnter={navigateTo.bind(null, '/auth/etsy')} />
        <Route path="shopify" component={AddShopifyShop} />
      </Route>
    </Route>
    <Route path="*" component={NotFound} status={404} />
  </Router>;
