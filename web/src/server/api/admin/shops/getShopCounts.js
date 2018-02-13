import Promise from 'bluebird';

export default (config, models, rabbitClient, req, res) => {
  const promises = [];
  promises.push(models.shops.getShopCount());
  promises.push(models.shops.getEtsyShopCount());
  return Promise.all(promises)
    .spread((userShops, etsyShops) => {
      res.json({
        userShops: parseInt(userShops, 10),
        etsyShops: parseInt(etsyShops, 10)
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
};
