exports.up = function(pgm) {
  pgm.addColumns('users', {
    login_count: { type: 'integer default 0' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('users', ['login_count']);
};
