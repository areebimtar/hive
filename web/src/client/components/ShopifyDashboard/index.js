import React from 'react';
import ShopDashboard from '../ShopDashboard';

import SHOP_PRODUCT_TABLE from 'app/client/channels/shopify/shopProductsTable';

export default function(props) {
  return (<ShopDashboard {...props} table={SHOP_PRODUCT_TABLE} />);
}
