import Promise from 'bluebird';
import _ from 'lodash';

import * as Utils from '../../utils';
import { assert } from 'global/assert';

export default (config, models, rabbitClient, req, res) => {
  const { shopId } = req.params;

  // First get shop
  return models.shops.getById(shopId).then(shop => {
    assert(shop, `There is no shop with ${shopId} ID`);
    // Now denorm the shop to get shop's account
    return Promise.all([
      shop,
      Utils.denorm(models, 'true', _.pick(shop, ['account_id']))
    ]);
  }).spread((shop, denorms) => {
    // Now get company id from shop's account
    const companyId = denorms[0].accountsById[shop.account_id].company_id;
    // And get all users with this company id
    return models.auth.users.getByCompanyId(companyId);
  }).then(users => {
    res.json(users);
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
};
