import _ from 'lodash';
import { assert } from 'global/assert';
import { CHANNEL } from 'global/constants';
import get from './get';

import Etsy from './etsy';
import Shopify from './shopify';

const channels = {
  [CHANNEL.ETSY]: Etsy,
  [CHANNEL.SHOPIFY]: Shopify
};

export default function(config, dbModels, rabbitClient) {
  const wrapper = (functionName) => async (req, res) => {
    const { session: { db }, params: { shopId } } = req;

    const models = dbModels[db];
    const [shop, account] = await models.compositeRequests.getShopAccountByShopId(shopId); // eslint-disable-line no-unused-vars
    const channelId = account.channel_id;
    const channel = channels[channelId];
    assert(channel, `Unknown channel ID ${channelId}`);

    const handler = _.get(channel, functionName, null);
    assert(handler, `No handler for ${functionName} in channel with ID ${channelId}`);
    return handler(config, models, rabbitClient, req, res);
  };

  return {
    get: get(config, dbModels, rabbitClient),
    getChannelData: wrapper('getChannelData'),
    products: {
      getProducts: wrapper('products.getProducts'),
      applyOperations: wrapper('products.applyOperations'),
      search: wrapper('products.search')
    }
  };
}
