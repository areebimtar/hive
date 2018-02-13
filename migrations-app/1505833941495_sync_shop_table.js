exports.up = function(pgm) {
  pgm.createTable('sync_shop', {
    shop_id: { type: 'bigint', notNull: true, references: 'shops(id) ON DELETE CASCADE' },
    product_id: { type: 'text', notNull: true, unique: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });

  // add unique constraint
  pgm.addConstraint(
    'sync_shop',
    'unique_shop_id_product_id',
    'UNIQUE (shop_id, product_id)'
  );
};

exports.down = function(pgm) {
  pgm.dropTable('sync_shop');
};
