exports.up = function(pgm) {
  pgm.createIndex('product_offerings', ['product_id'], { name: 'product_offerings_product_id_index', method: 'btree' });
  pgm.createIndex('product_offering_options', ['product_offering_id'], { name: 'product_offerings_option_product_offering_id_index', method: 'btree' });
  pgm.createIndex('product_offering_options', ['variation_option_id'], { name: 'product_offerings_option_variation_option_id_index', method: 'btree' });
};

exports.down = function(pgm) {
  pgm.dropIndex('product_offerings', ['product_id'], { name: 'product_offerings_product_id_index' });
  pgm.dropIndex('product_offering_options', ['product_offering_id'], { name: 'product_offerings_option_product_offering_id_index' });
  pgm.dropIndex('product_offering_options', ['variation_option_id'], { name: 'product_offerings_option_variation_option_id_index'});
};
