import _ from 'lodash';
import etsy from './etsy';
import shopify from './shopify';

import { CHANNEL, CHANNEL_NAMES } from 'global/constants';

export const channels = {
  [CHANNEL.ETSY]: etsy,
  [CHANNEL.SHOPIFY]: shopify
};

export function getChannelById(channelId) {
  return channels[channelId];
}

export function getChannelByName(channelName) {
  const channelId = _.findKey(CHANNEL_NAMES, name => name === String(channelName).toLowerCase());
  return getChannelById(channelId);
}
