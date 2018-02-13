exports.up = function(pgm) {
  pgm.addColumns('variation_options', {
    sequence: { type: 'int', default: 0 }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('variation_options', ['sequence']);
};
