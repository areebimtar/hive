import _ from 'lodash';
import * as Utils from '../../../utils';
import { FIELDS } from 'global/modules/shopify/constants';

const IMAGES_ROUTE_BASE = '/api/v1/images';

export default async (config, models, rabbitClient, req, res) => {
  const { id, offset, limit } = req.query;

  const ids = Utils.getAsArray(id);
  const products = await models.shopifyProducts.getAll(ids, offset, limit);

  const imgageIds = _.uniq(_.reduce(products, (result, product) => result.concat(product[FIELDS.PHOTOS] || []), []));
  const images = await models.images.getByIds(imgageIds);
  const imagesWithPreviewUrl = _.map(images, image => {
    if (!image.thumbnail_url) { image.thumbnail_url = `${IMAGES_ROUTE_BASE}/${image.id}`; }
    if (!image.fullsize_url) { image.fullsize_url = `${IMAGES_ROUTE_BASE}/${image.id}`; }
    return image;
  });

  const result = {
    count: ids.length,
    products: _.map(products, FIELDS.ID),
    productsById: _.reduce(products, (map, product) => _.set(map, product[FIELDS.ID], product), {}),
    imagesById: _.reduce(imagesWithPreviewUrl, (map, image) => _.set(map, image.id, image), {})
  };

  res.json(result);
};
