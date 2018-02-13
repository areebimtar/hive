exports.up = function(pgm) {
  pgm.sql("INSERT INTO channels (id, name) values (1, 'Etsy'), (2, 'Shopify') ON CONFLICT DO NOTHING");
};

exports.down = function(pgm) {

};
