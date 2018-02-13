exports.up = function(pgm) {
  pgm.createTable('aggregates', {
    shop_id: { type: 'bigint', notNull: true, references: 'shops(id) ON DELETE CASCADE' },
    message_id: { type: 'text', notNull: true, unique: true },
    status: { type: 'text' },
    message: { type: 'text' }
  });

  // add unique constraint
  pgm.addConstraint(
    'aggregates',
    'unique_shop_id_message_id',
    'UNIQUE (shop_id, message_id)'
  );
};

exports.down = function(pgm) {
  pgm.dropTable('aggregates');
};
