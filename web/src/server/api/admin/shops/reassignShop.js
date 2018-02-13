import pgp from 'pg-promise';
import { assert } from 'global/assert';

export default async (config, models, rabbitClient, req, res) => {
  try {
    const { shopId, userId } = req.params;

    const user = await models.auth.users.getById(userId);
    if (!user) {
      res.status(404).json({ error: 'No user with given id' });
      return;
    }
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

    await models.accounts.updateCompanyId(
      shop.account_id, user.company_id);
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
