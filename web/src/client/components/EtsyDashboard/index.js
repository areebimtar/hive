import React from 'react';
import ShopDashboard from '../ShopDashboard';

import ETSY_SHOP_PRODUCT_TABLE from 'app/client/channels/etsy/shopProductsTable';

export default function(props) {
  return (<ShopDashboard {...props} table={ETSY_SHOP_PRODUCT_TABLE} />);
}
