var clients = [
    { id: '1', name: 'TestClientApp1-Name', consumerKey: 'TestClientApp1', consumerSecret: 'TestClientApp1-Secret' }
];


exports.find = function(id, done) {
  for (var i = 0, len = clients.length; i < len; i++) {
    var client = clients[i];
    if (client.id === id) {
      return done(null, client);
    }
  }
  return done(null, null);
};

exports.findByConsumerKey = function(consumerKey, done) {
  for (var i = 0, len = clients.length; i < len; i++) {
    var client = clients[i];
    if (client.consumerKey === consumerKey) {
      return done(null, client);
    }
  }
  return done(null, null);
};
