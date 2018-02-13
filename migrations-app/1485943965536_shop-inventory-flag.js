exports.up = function up(pgm) {
  pgm.addColumns('shops', {
    inventory: { type: 'boolean', default: false, notNull: true }
  });
};

exports.down = function down(pgm) {
  pgm.dropColumns('shops', [ 'inventory' ]);
};
