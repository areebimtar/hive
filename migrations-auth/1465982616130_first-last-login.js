exports.up = function(pgm) {
  pgm.addColumns('users', {
    first_login: { type: 'timestamp with time zone' },
    last_login: { type: 'timestamp with time zone' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('users', ['first_login', 'last_login']);
};
