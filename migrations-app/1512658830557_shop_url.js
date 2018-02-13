exports.up = function(pgm) {
  pgm.addColumns('shops', {
    domain: { type: 'string' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('shops', ['domain']);
};
