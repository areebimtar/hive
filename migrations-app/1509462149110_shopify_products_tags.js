exports.up = function(pgm) {
  pgm.addColumns('shopify_products', {
    tags: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') }
  });

  pgm.createIndex('shopify_products', 'tags', { name: 'shopify_products_tags', method: 'gin' });
};

exports.down = function(pgm) {
  pgm.dropIndex('shopify_products', 'tags', { name: 'shopify_products_tags' });

  pgm.dropColumns('shopify_products', ['tags']);
};
