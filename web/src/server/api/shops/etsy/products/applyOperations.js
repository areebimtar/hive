import 'core-js/fn/array/includes';
import _ from 'lodash';

import logger from 'logger';
import { now } from '../../../utils';
import { assert } from 'global/assert';

// Enqueue apply operations
async function fireEnqueueApplyOps(models, rabbitClient, accountId, companyId, channelId, shopId, operations, dbName) {
  const operation = `enqueueApplyOpsEtsy(companyId=${companyId}, channelId=${channelId}, shopId=${shopId}, opsData=${JSON.stringify({ shopId, operations }, null, 2)}, dbName=${dbName})`;

  try {
    return rabbitClient.enqueueApplyOpsEtsy(companyId, channelId, shopId, operations, dbName);
  } catch (e) {
    logger.error({
      topic: 'enqueue failed',
      message: operation,
      error: e
    });
    throw e;
  }
}

export default async (config, models, rabbitClient, req, res) => {
  const { params: { shopId }, session: { db } } = req;
  const ops = req.body;
  let time;
  const handlerTime = now();
  res.perfData = { timings: {} };

  try {
    time = now();
    const shop = await models.shops.getById(shopId);
    assert(shop, `There is no shop with ${shopId} ID`);
    res.perfData.timings.getShopTime = now() - time;

    time = now();
    const { id: accountId, company_id: companyId, channel_id: channelId } =  await models.accounts.getById(shop.account_id);
    res.perfData.timings.getAccountTime = now() - time;

    // get all ids of updated products
    const ids = _.filter(_.unique(_.reduce(ops, (result, op) => result.concat(op.products), [])), id => !!id);

    time = now();
    await models.shops.applyStarted(shopId, ids.length);
    res.perfData.timings.applyStarted = now() - time;

    time = now();
    await fireEnqueueApplyOps(models, rabbitClient, accountId, companyId, channelId, shopId, ops, db);
    res.perfData.timings.fireEnqueueApplyOps = now() - time;

    res.perfData.timings.handlerTime = now() - handlerTime;
    return res.json({result: 'succeeded'});
  } catch (err) {
    logger.error(err);
    res.perfData.handlerTime = now() - handlerTime;
    return res.status(503).json({result: 'failed', error: err.message});
  }
};
