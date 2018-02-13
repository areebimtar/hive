import _ from 'lodash';

import Etsy from '../../../../shared/modules/etsy';
import { WORKER, SECTION_EXISTS_MESSAGE } from '../../../../shared/constants';

async function getSectionShopAccount(models, logger, sectionId, shopId) {
  const result = await models.compositeRequests.getSectionShopAccount(sectionId, shopId);

  const [section, shop, account] = result;
  logger.debug('got section', section);
  logger.debug('got shop', shop);
  logger.debug('got account', account);

  if (!section) {
    throw new Error(`Section #${sectionId} not found.`);
  }

  return result;
}

export async function start(config, models, logger, data, unusedTaskId, unusedManager, requests, rateLimiter) {
  logger.info(`createSection ${JSON.stringify(data)}`);
  const { sectionId, shopId } = JSON.parse(data);
  if (!_.isNumber(sectionId) && !_.isString(sectionId)) { throw new Error(`Invalid section id: ${sectionId}`); }
  if (!_.isNumber(shopId) && !_.isString(shopId)) { throw new Error(`Invalid shop id: ${shopId}`); }

  const [section, shop, account] = await getSectionShopAccount(models, logger, sectionId, shopId);
  const etsy = new Etsy(config, rateLimiter, logger);
  let newSection;
  try {
    newSection = await etsy.createNewSection(account, shop.channel_shop_id, section.value, requests);
  } catch (e) {
    if (e && (_.indexOf(e.message, SECTION_EXISTS_MESSAGE) !== -1)) {
      // This handles a very special case that can only happen when
      // a section is created in Etsy after we dealt with sections
      // in syncShop already and has the same name as our new section
      const etsySections = await etsy.getShopSections(account, shop.channel_shop_id, requests);
      newSection = _.find(etsySections, { name: section.value });
      if (!newSection) {
        throw new Error(`Cannot find section ${section.value} on Etsy`);
      }
    } else {
      throw e;
    }
  }
  await models.sections.update(shopId, section.id, newSection);
  return { result: WORKER.TASK_RESULTS.SUCCEEDED };
}
