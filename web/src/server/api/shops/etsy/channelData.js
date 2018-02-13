import _ from 'lodash';

async function getSections(models, shopId) {
  const sections = await models.sections.getSections(shopId);

  const response = _.reduce(sections.ids, (result, id) => {
    result[id] = sections[id].value;
    return result;
  }, { shopId: sections.shopId, ids: sections.ids });

  return response;
}

export default async (config, models, rabbitClient, req, res) => {
  const { shopId } = req.params;

  try {
    const sectionsMap = await getSections(models, shopId);
    res.json({ sectionsMap });
  } catch (error) {
    res.json({error: error.message});
  }
};
