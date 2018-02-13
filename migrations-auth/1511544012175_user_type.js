exports.up = function(pgm) {
  pgm.addColumns('users', {
    type: { type: 'text', notNull: true, default: 'stable' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('users', ['type']);
};
