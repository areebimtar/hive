export default (config, models, rabbitClient, req, res) => {
  const { userId } = req.params;
  return models.auth.users.getById(userId)
    .then(user => {
      if (!user) {
        res.status(404).json({ error: 'No user for given id' });
      } else {
        res.json(user);
      }
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
};
