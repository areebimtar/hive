exports.up = function(pgm) {
  pgm.addColumns('shops', {
    invalid: { type: 'boolean', default: false },
    error: { type: 'text', default: null }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('shops', ['invalid', 'error']);
};
