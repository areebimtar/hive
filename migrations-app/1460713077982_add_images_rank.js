exports.up = function(pgm) {
  pgm.addColumns('images', {
    rank: { type: 'integer', default: null}
  });
  pgm.addConstraint('images', 'image_rank_unique', 'UNIQUE (product_id, rank)');
};

exports.down = function(pgm) {
  pgm.dropConstraint('images', 'image_rank_unique');
  pgm.dropColumns('images', ['rank']);
};
