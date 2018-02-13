import _ from 'lodash';

function denormLastSeenShop(models, profile) {
  if (!profile.last_seen_shop) { return profile; }

  return models.shops.getById(profile.last_seen_shop)
    .then(shop => _.set(profile, 'last_seen_shop', shop));
}

export default (config, models, rabbitClient, req, res) => {
  const userId = req.session.userId;
  return models.userProfiles.getById(userId)
    .then(denormLastSeenShop.bind(this, models))
    .then((profile) => {
      // we have user's profile data, send them to client
      res.json(profile);
    })
    .catch(err => {
      res.json({error: err.message});
    });
};
