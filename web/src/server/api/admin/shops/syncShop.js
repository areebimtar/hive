import pgp from 'pg-promise';
import { SHOP_SYNC_STATUS_DUPLICATE } from '../../../../../../shared/db/models/constants';
import { assert } from 'global/assert';
import { CHANNEL, CHANNEL_NAMES } from 'global/constants';

function enqueueShopSync(rabbitClient, userId, shopId, account, dbName) {
  if (parseInt(account.channel_id, 10) === CHANNEL.ETSY) {
    return rabbitClient.enqueueShopSyncEtsy(account.company_id, account.channel_id, shopId, dbName);
  }
  const channelName = CHANNEL_NAMES[account.channel_id];
  return rabbitClient.enqueueShopSync(userId, shopId, channelName);
}

export default async (config, models, rabbitClient, req, res) => {
  try {
    const { params: { shopId }, session: { userId, db } } = req;

    let shop;
    try {
      shop = await models.shops.getById(shopId);
      assert(shop, `There is no shop with ${shopId} ID`);
    } catch (err) {
      if (err.code === pgp.errors.queryResultErrorCode.noData) {
        res.status(404).json({ error: 'No shops with given id' });
        return;
      } else {
        throw err;
      }
    }

    if (shop.invalid || shop.sync_status === SHOP_SYNC_STATUS_DUPLICATE) {
      const duplicateShops = await models.shops.getByChannelShopId(shop.channel_shop_id);
      if (!duplicateShops || duplicateShops.length === 0) {
        res.status(500).json({ error: 'No shop with given channel id' });
        return;
      } else if (duplicateShops.length > 1) {
        res.status(400).json({ error: 'Cannot sync duplicate shop' });
        return;
      } else {
        await models.shops.resetError(shopId);
      }
    }

    await models.shops.resetInvalidFlag(shopId);
    const account = await models.accounts.getById(shop.account_id);
    await enqueueShopSync(rabbitClient, userId, shopId, account, db);
    res.status(200).send();
  } catch (err) {
    res.status(500);
    if (err && err.message) {
      res.json({ error: err.message });
    } else {
      res.send();
    }
  }
};
