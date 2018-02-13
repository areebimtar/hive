import _ from 'lodash';
import Promise from 'bluebird';
import * as messageUtils from '../messageUtils';

import { EXCHANGES, MESSAGE_TYPE, STATUS } from '../constants';
import { SHOP_SYNC_INTERVAL, CHANNEL } from 'global/constants';

export default class ScheduleShopSync {
  constructor(config, models, rabbit) {
    this.config = config;
    this.models = models;
    this.rabbit = rabbit;
  }

  async scheduleShopSync(logger, shopId, userId) {
    logger.info(`Scheduling sync shop for ID ${shopId}`);

    const type = MESSAGE_TYPE.SHOPIFY.SYNC_SHOP.COMMAND;
    const msg = {
      headers: {
        type: type,
        messageId: messageUtils.getNewMessageId(),
        shopId: shopId,
        userId: userId
      },
      stack: [],
      body: {}
    };

    return this.rabbit.publish(logger, EXCHANGES.COMMANDS, type, msg);
  }

  async getUserIdByShopId(logger, shopId) {
    const [shop, account] = await this.models.compositeRequests.getShopAccountByShopId(shopId); // eslint-disable-line no-unused-vars
    const user = await this.models.auth.users.getByCompanyId(account.company_id);

    return _.get(user, '[0].id');
  }

  async process(logger) {
    const shopifyConfig = this.config.shopify;

    try {
      const shopsToSync = await this.models.compositeRequests.getShopsToSync(SHOP_SYNC_INTERVAL, shopifyConfig.maxListingsPerCheckShopSync, CHANNEL.SHOPIFY);
      await Promise.map(shopsToSync, async shop => {
        const userId = await this.getUserIdByShopId(logger, shop.id);
        return this.scheduleShopSync(logger, shop.id, userId);
      });
    } catch (error) {
      logger.error('Check shop sync failed', error);
    }

    // return token back to wait queue
    return STATUS.NACK;
  }
}
