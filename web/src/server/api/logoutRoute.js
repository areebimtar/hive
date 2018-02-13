import logger from '../logger';


// this middleware redirects user to /logout at Auth server
export default (config) => (req, res) => {
  const { keepCookie } = req.query;
  logger.debug(`"keepCookie" set to: ${keepCookie}`);

  const url = !!keepCookie ? config.loginPage : config.logoutPage;

  logger.debug(`Redirecting to: ${url}`);
  res.redirect(url);
};
