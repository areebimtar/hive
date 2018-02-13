var tokens = {};


exports.get = function(key) {
  return tokens[key];
};

exports.find = function(key, done) {
  var token = tokens[key];
  if (key === 'TestClientApp1') {
     token = tokens['TmpRequestToken1'];
  }
  return done(null, token);
};

exports.save = function(token, secret, clientID, callbackURL, done) {
  tokens[token] = { secret: secret, clientID: clientID, callbackURL: callbackURL };
  return done(null);
};

exports.approve = function(key, userID, verifier, done) {
  var token = tokens[key];
  token.userID = userID;
  token.verifier = verifier;
  token.approved = true;
  return done(null);
};
