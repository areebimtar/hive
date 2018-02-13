import _ from 'lodash';
import * as Utils from '../../utils';
import { assert } from 'global/assert';

export default (config, models, rabbitClient, req, res) => {
  // get shopId and denorm
  const { shopId } = req.params;
  const { denorm } = req.query;

  // get shop
  const result = {};
  models.shops.getById(shopId).then(shop => {
    assert(shop, `There is no shop with ${shopId} ID`);
    // add shop to the result
    _.extend(result, shop);
    // denorm properties
    return Utils.denorm(models, denorm, shop);
  }).then( (denorms) => {
    // apply denorm to result object
    _.each(denorms, data => _.extend(result, data));
    // we get what we wanted, send it to the client
    res.json(result);
  }).catch(err => {
    res.status(400).json({error: err.message});
  });
};
