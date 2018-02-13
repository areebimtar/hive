import * as estyOperationHandlers from './etsy/bulkEditOps';
import * as shopifyOperationHandlers from './shopify/bulkEditOps';

import { CHANNEL } from '../constants';

export const channels = {
  [CHANNEL.ETSY]: estyOperationHandlers,
  [CHANNEL.SHOPIFY]: shopifyOperationHandlers
};

export function getHandlersByChannelId(channelId) {
  return channels[channelId];
}
