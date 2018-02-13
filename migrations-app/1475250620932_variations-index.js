exports.up = function(pgm) {
  pgm.createIndex('variation_options', ['variation_id'], {name: 'variation_options_index'} );
};

exports.down = function(pgm) {
  pgm.dropIndex('variation_options', ['variation_id'], {name: 'variation_options_index'} );
};
