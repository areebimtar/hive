exports.up = function(pgm) {
  pgm.createIndex('products', ['id'], {name: 'products_id', method: 'btree', concurently: true} );
  pgm.createIndex('products', ['shop_id'], { name: 'products_shop_id', method: 'btree', concurently: true });
  pgm.createIndex('products', ['shop_id', 'property_name'], { name: 'products_shop_id_property_name', method: 'btree', concurently: true});
};

exports.down = function(pgm) {
  pgm.dropIndex('products', ['id'], {name: 'products_id' });
  pgm.dropIndex('products', ['shop_id'], { name: 'products_shop_id' });
  pgm.dropIndex('products', ['shop_id', 'property_name'], { name: 'products_shop_id_property_name' });
};
