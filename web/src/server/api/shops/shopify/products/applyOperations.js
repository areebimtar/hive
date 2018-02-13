import logger from 'logger';
import { assert } from 'global/assert';
import { CHANNEL_NAMES } from 'global/constants';

export default async (config, models, rabbitClient, req, res) => {
  const { params: { shopId }, body: operations, session: { userId } } = req;

  const [shop, account] = await models.compositeRequests.getShopAccountByShopId(shopId);
  assert(shop, `No shop with ID: ${shopId}`);
  assert(account, `No account for shop with ID: ${shopId}`);

  const channelName = CHANNEL_NAMES[account.channel_id];

  try {
    await rabbitClient.enqueueApplyOps(userId, shopId, channelName, operations);
  } catch (e) {
    logger.error({
      topic: 'enqueue failed',
      message: `enqueueApplyOps(shopId=${shopId}, opsData=${JSON.stringify({ shopId, operations }, null, 2)})`,
      error: e
    });
    throw e;
  }

  return res.json({ result: 'succeeded' });
};
