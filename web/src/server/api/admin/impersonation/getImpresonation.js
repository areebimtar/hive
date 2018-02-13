export default (config, models, rabbitClient, req, res) => {
  const impersonating = !!(req.session
    && req.session.originalUser
    && req.session.impersonating);
  const responseBody = { impersonating };
  if (impersonating) {
    responseBody.email = req.session.email;
  }
  res.status(200).json(responseBody);
};
