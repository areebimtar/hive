export default (config, models, rabbitClient, req, res) => {
  let userId = req.session && req.session.userId;
  if (req.session && req.session.impersonating && req.session.originalUser) {
    userId = req.session.originalUser.id;
  }

  return models.auth.users.getById(userId)
    .then(user => {
      if (!user) {
        res.status(404).json({ error: 'No user for given id' });
      } else {
        res.status(200).json(user);
      }
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
};
