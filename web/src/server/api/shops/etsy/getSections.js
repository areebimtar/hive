import _ from 'lodash';

export default (config, models, rabbitClient, req, res) => {
  // get shop_id
  const { shopId } = req.params;

  // get sections
  return models.sections.getSections(shopId).then(sections => {
    const response = _.reduce(sections.ids, (result, id) => {
      result[id] = sections[id].value;
      return result;
    }, { shopId: sections.shopId, ids: sections.ids });
    res.json(response);
  }).catch(err => {
    res.json({error: err.message});
  });
};
