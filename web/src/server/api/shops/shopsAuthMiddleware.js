import logger from '../../logger';

const handleError = (res, error) => {
  logger.debug(error);
  res
    .status(401)
    .json({result: 'failed', reason: 'Access Denied!'});
};

// this middleware checks whether user has access to the shop
export default (config, dbModels) => (req, res, next) => {
  const { session: { db, companyId }, params: { shopId } } = req;

  const models = dbModels[db];
  models.shops.verify(shopId, companyId).then(
    valid => (valid) ? next() : handleError(res, `Shops auth middleware: Access Denied! for shop ${shopId}`),
    error => handleError(res, `Shops auth middleware: Access Denied! for shop with error - ${error}`)
  );
};
