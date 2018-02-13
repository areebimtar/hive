import Promise from 'bluebird';

export default (config, models, rabbitClient, req, res) => {
  const { userId } = req.params;
  const { offset, limit } = req.query;
  return models.auth.users.getById(userId)
    .then(user => {
      if (!user) {
        res.status(404).json({ error: 'No user for given id' });
        return Promise.resolve();
      } else {
        return models.shops
          .getByCompanyId(user.company_id, offset, limit);
      }
    }).then(shops => {
      res.json(shops);
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
};
