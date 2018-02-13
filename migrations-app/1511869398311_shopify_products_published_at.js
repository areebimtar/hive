exports.up = function(pgm) {
  pgm.addColumns('shopify_products', {
    published_at: { type: 'timestamp with time zone' }
  });

  pgm.createIndex('shopify_products', 'published_at', { name: 'shopify_products_published_at', method: 'btree' });
};

exports.down = function(pgm) {
  pgm.dropIndex('shopify_products', 'published_at', { name: 'shopify_products_published_at' });

  pgm.dropColumns('shopify_products', ['published_at']);
};
