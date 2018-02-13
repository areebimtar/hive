exports.up = function(pgm) {
  pgm.addConstraint('vela_images', 'unique_hash', 'UNIQUE (hash)');
};

exports.down = function(pgm) {
  pgm.dropConstraint('vela_images', 'unique_hash');
};
