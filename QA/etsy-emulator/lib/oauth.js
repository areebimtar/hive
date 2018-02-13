var passport = require('passport');
var site = require('./oauth/site');
var oauth = require('./oauth/oauth');
var db = require('./oauth/db');
var app;
var cfg;

const AUTH_REDIRECT_PATH = '/authorize/just_return_redirect';


//--------------------------------------------------------------------------------
// find client and its key and redirect the browser to Location: http://127.0.0.1/callback?oauth_token=XXXX&oauth_verifier=YYYY#_=_
function oauthRedirect(req, res) {
  token = db.requestTokens.get(req.query.oauth_token);
  if (token) {
    db.clients.find(token.clientID, function(err, client) {
      if (client == null) {
        res.status(500).send('Internal error, client not found!');
      } else {
                  req.query.oauth_consumer_key = client.consumerKey;
        // if (client.consumerKey == req.query.oauth_consumer_key) {
        if (true) { // HACK !!! TODO
          db.requestTokens.approve(req.query.oauth_token, '1', 'This-is-verifier-1', function() { });/* '1' = userId*/
          res.header('Location', token.callbackURL + '?oauth_token=' + client.consumerKey + '&oauth_verifier=' + token.verifier + '#_=_');
          res.status(302).send('User authenticated!');
        } else {
          res.status(404).send('Error, client key not found!');
        }
      }
    })
  } else {
    res.status(404).send('Sorry, temporary customer token not found!');
  }
}


function init(application, config) {
  app = application;
  cfg = config;
  oauth.AUTH_URL = app.EXT_BASE_URL + AUTH_REDIRECT_PATH;
  app.use(passport.initialize());
  app.use(passport.session());
  //app.use(app.router);
  require('./oauth/auth');

		// 1) OAuth: get request_token, return [ TmpRequestToken1, TmpRequestSecret1, URL:.../just_return_redirect ]
	app.post('/v2/oauth/request_token', oauth.requestToken);

		// 2) OAuth: client-app redirect browser to the 'just_return_redirect' URL
	app.get(AUTH_REDIRECT_PATH, oauthRedirect);

	  // 3) Client-app finalizes authentication, return accessToken+Secret
	app.post('/v2/oauth/access_token', oauth.accessToken);
}

module.exports = {
  init: init
};
