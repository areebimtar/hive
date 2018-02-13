exports.up = function(pgm) {
  pgm.renameColumn('shopify_products', 'images', 'photos');
};

exports.down = function(pgm) {
  pgm.renameColumn('shopify_products', 'photos', 'images');
};
