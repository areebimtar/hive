exports.up = function up(pgm) {
  pgm.addColumns('product_offerings', {
    visibility: { type: 'boolean', default: true }
  });
};

exports.down = function down(pgm) {
  pgm.dropColumns('product_offerings', [ 'visibility' ]);
};
