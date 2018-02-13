import Promise from 'bluebird';

export default (config, models, rabbitClient, req, res) => {
  const { query } = req.query;
  if ((query || query === 0) && query !== '') {
    return models.shops.searchShops(query)
      .then(searchResult => {
        res.json(searchResult);
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  } else {
    res.json([]);
    return Promise.resolve();
  }
};
