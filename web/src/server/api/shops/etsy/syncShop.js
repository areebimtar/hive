import { assert } from 'global/assert';

export default (config, models, rabbitClient) => {
  return (req, res) => {
    const { params: { shopId }, session: { db } } = req;

    return models.shops.getById(shopId)
      .then((shop) => {
        assert(shop, `There is no shop with ${shopId} ID`);
        return models.accounts.getById(shop.account_id);
      })
      .then((account) => {
        return rabbitClient.enqueueShopSyncEtsy(account.company_id, account.channel_id, shopId, db);
      })
      .then(() => {
        res.json({result: 'succeeded'});
      })
      .catch((err) => {
        res.status(503).json({result: 'failed', reason: err.message});
      });
  };
};
