
// Resets session of an admin that is impersonating a user
export default async (config, models, rabbitClient, req, res) => {
  try {
    const isImpersonating = req.session
      && req.session.originalUser
      && req.session.impersonating;
    if (isImpersonating) {
      // Change the session object on request so that user is
      // authenticated as admin he is, not the user he became.
      req.session.userId = req.session.originalUser.id;
      req.session.email = req.session.originalUser.email;
      req.session.firstName = req.session.originalUser.first_name;
      req.session.lastName = req.session.originalUser.last_name;
      req.session.loginCount = req.session.originalUser.login_count;
      req.session.userName = req.session.originalUser.email;
      req.session.companyId = req.session.originalUser.company_id;
      req.session.db = req.session.originalUser.db;
      delete req.session.impersonating;
      delete req.session.originalUser;
      res.status(200).send();
    } else {
      res.status(400).json({ error: 'No impersonation in progress' });
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
