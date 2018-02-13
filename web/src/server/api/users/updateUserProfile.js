export default (config, models, rabbitClient, req, res) => {
  const userId = req.session && req.session.userId;
  const changedProperties = req.body;

  if (!(userId && changedProperties)) {
    res.json({error: 'Invalid request'});
    return;
  }

  models.userProfiles.update(userId, changedProperties)
    .then(() => {
      res.json({result: 'success'});
    }) // TODO: check this
    .catch(err => {
      res.json({error: err.message});
    });
};
