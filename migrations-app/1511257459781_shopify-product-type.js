exports.up = function(pgm) {
  pgm.addColumns('shopify_products', {
    product_type: { type: 'text' }
  });

  pgm.createIndex('shopify_products', 'product_type', { name: 'shopify_products_product_type', method: 'btree' });
};

exports.down = function(pgm) {
  pgm.dropIndex('shopify_products', 'product_type', { name: 'shopify_products_product_type' });

  pgm.dropColumns('shopify_products', ['product_type']);
};
