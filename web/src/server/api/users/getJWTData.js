import crypto from 'crypto';

export default (config, models, rabbitClient, req, res) => {
  res.json({
    userId: parseInt(req.session.userId, 10),
    userName: req.session.userName,
    email: req.session.email,
    firstName: req.session.firstName,
    lastName: req.session.lastName,
    loginCount: req.session.loginCount,
    userHash: crypto.createHmac('sha256', config.intercom.secureModeSecretKey).update(req.session.userId).digest('hex')
  });
};
