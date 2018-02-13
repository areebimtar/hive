import logger from 'logger';

export default (config, models, rabbitClient, req, res) => {
  const { shopId } = req.params;
  return models.shops.deleteById(shopId)
    .then(() => {
      const userId = req.session && req.session.userId;
      logger.info(`Deleted shop with id ${shopId} by user with id ${userId}`);
      res.status(200).send();
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
};
