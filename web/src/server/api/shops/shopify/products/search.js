import _ from 'lodash';
import Promise from 'bluebird';
import { FIELDS } from 'global/modules/shopify/constants';
import { camelizeKeys } from 'global/db/utils';

export default async (config, models, rabbitClient, req, res) => {
  const { userId } = req.session;
  const { shopId } = req.params;
  const { offset, limit, fields, ...filters } = req.body;

  const promises = [
    models.shopifyProducts.getFiltered(shopId, offset, limit, fields, filters),
    models.shopifyProducts.getFilteredCount(shopId, filters),
    models.shopifyProducts.getFilteredFilters(shopId, filters),
    models.userProfiles.update(userId, { last_seen_shop: shopId })
  ];
  const [products, count, filtersData] = await Promise.all(promises);

  const imgageIds = _.uniq(_.reduce(products, (result, product) => result.concat(product[FIELDS.PHOTOS] || []), []));
  const images = await models.images.getByIds(imgageIds);

  const result = {
    count: count,
    filters: filtersData.filters,
    products: _.map(products, FIELDS.ID).sort(),
    productsById: _.reduce(products, (map, product) => _.set(map, product[FIELDS.ID], camelizeKeys(product)), {}),
    imagesById: _.reduce(images, (map, image) => _.set(map, image.id, image), {})
  };

  return res.json(result);
};
