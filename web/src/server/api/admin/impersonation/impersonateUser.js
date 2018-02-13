
export default async (config, models, rabbitClient, req, res) => {
  try {
    if (req.session && req.session.impersonating) {
      res.status(400).json({ error: 'You are already impersonating someone' });
      return;
    }

    const adminId = req.session.userId;
    const { userId } = req.params;
    if (adminId === userId) {
      res.status(400).json({ error: 'Cannot impresonate yourself' });
      return;
    }

    const admin = await models.auth.users.getById(req.session.userId);
    const user = await models.auth.users.getById(userId);
    if (user) {
      req.session.impersonating = true;
      req.session.originalUser = admin;
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.firstName = user.first_name;
      req.session.lastName = user.last_name;
      req.session.loginCount = user.login_count;
      req.session.userName = user.email;
      req.session.companyId = user.company_id;
      req.session.db = user.db;
      res.status(200).json();
    } else {
      res.status(404).json({ error: 'No user with given id' });
    }
  } catch (err) {
    res.status(500);
    if (err && err.message) {
      res.json({ error: err.message });
    } else {
      res.send();
    }
  }
};
