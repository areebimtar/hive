exports.up = function(pgm) {
  pgm.alterColumn( 'variations', 'formatted_name', {notNull: false} );
  pgm.alterColumn( 'variation_options', 'formatted_value', {notNull: false} );
  pgm.alterColumn( 'variation_options', 'value_id', {notNull: false} );
  pgm.alterColumn( 'variation_options', 'price', {notNull: false} );
};

exports.down = function(pgm) {

};
