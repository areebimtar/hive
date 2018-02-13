exports.up = function(pgm) {
  pgm.addColumn('shops', {
    created_at: { type: 'timestamp with time zone' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('shops', ['created_at']);
};
