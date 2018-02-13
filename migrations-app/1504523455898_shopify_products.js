exports.up = function(pgm) {
  pgm.createTable('shopify_products', {
    id: { type: 'serial', primaryKey: true },
    shop_id: { type: 'bigint', notNull: true, references: 'shops(id) ON DELETE CASCADE' },
    product_id: { type: 'text', notNull: true, unique: true },
    title: { type: 'text' },
    body_html: { type: 'text' },
    images: { type: 'bigint[]', notNull: true, default: pgm.func('ARRAY[]::bigint[]') },
    updated_at: { type: 'timestamp with time zone' },
    _hive_is_invalid: { type: 'boolean', notNull: true, default: false },
    _hive_invalid_reason: { type: 'text' },
    _hive_modified_by_hive: { type: 'boolean', notNull: true, default: false },
    _hive_updated_at: { type: 'timestamp with time zone' },
    changed_properties: { type: 'text[]', notNull: true, default: pgm.func('ARRAY[]::text[]') },
    last_sync: { type: 'timestamp with time zone' }
  });

  // add unique constraint
  pgm.addConstraint(
    'shopify_products',
    'unique_product_id_shop_id',
    'UNIQUE (product_id, shop_id)'
  );
};

exports.down = function(pgm) {
  pgm.dropTable('shopify_products');
};
