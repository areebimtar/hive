exports.up = function(pgm) {
  pgm.addColumns('aggregates', {
    deleted: { type: 'boolean', default: false, notNull: true }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('aggregates', ['deleted']);
};
