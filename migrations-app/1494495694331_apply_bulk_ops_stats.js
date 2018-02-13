exports.up = function up(pgm) {
  pgm.addColumns('shops', {
    applying_operations: { type: 'boolean', notNull: true, default: false },
    to_apply: { type: 'integer', notNull: true, default: 0 },
    applied: { type: 'integer', notNull: true, default: 0 }
  });
};

exports.down = function down(pgm) {
  pgm.dropColumns('shops', [
    'applying_operations',
    'to_apply',
    'applied'
  ]);
};
