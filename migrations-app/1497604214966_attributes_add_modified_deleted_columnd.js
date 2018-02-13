exports.up = function up(pgm) {
  pgm.addColumns('attributes', {
    modified: { type: 'boolean', notNull: true, default: false },
    deleted: { type: 'boolean', notNull: true, default: false }
  });
};

exports.down = function down(pgm) {
  pgm.dropColumns('attributes', ['modified', 'deleted']);
};
