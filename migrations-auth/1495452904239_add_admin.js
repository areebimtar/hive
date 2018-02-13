exports.up = function(pgm) {
  pgm.addColumns('users', {
    admin: { type: 'bool', notNull: true, default: false }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('users', ['admin']);
};
