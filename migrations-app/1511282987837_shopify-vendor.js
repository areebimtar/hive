exports.up = function(pgm) {
  pgm.addColumns('shopify_products', {
    vendor: { type: 'text' }
  });

  pgm.createIndex('shopify_products', 'vendor', { name: 'shopify_products_vendor', method: 'btree' });
};

exports.down = function(pgm) {
  pgm.dropIndex('shopify_products', 'vendor', { name: 'shopify_products_vendor' });

  pgm.dropColumns('shopify_products', ['vendor']);
};
