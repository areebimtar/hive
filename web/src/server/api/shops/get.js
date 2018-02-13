import _ from 'lodash';
import Promise from 'bluebird';

import * as Utils from '../utils';


function number(input) {
  const val = parseInt(input, 10);
  return (_.isNaN(val)) ? undefined : val;
}

export default (config, dbModels) => {
  return (req, res) => {
    // get user_id and  companyId
    const { companyId, db } = req.session;
    const { denorm, offset, limit } = req.query;

    const models = dbModels[db];

    const promises = [];
    // get shops
    promises.push(models.shops.getByCompanyId(companyId, number(offset), number(limit)));
    // get total count of shops
    promises.push(models.shops.getByCompanyIdCount(companyId));
    // when querying for shops, return all channels as well
    const result = {};
    Promise.all(promises).then(responses => {
      // add shops and shops count to the result
      _.extend(result, Utils.normalize('shops', responses[0]));
      _.extend(result, responses[1]);
      // denorm properties
      return Utils.denorm(models, denorm, responses[0]);
    }).then( (denorms) => {
      // apply denorm to result object
      _.each(denorms, data => _.extend(result, data));
      // we get what we wanted, send it to the client
      res.json(result);
    }).catch(err => {
      res.json({error: err.message});
    });
  };
};
