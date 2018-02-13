exports.up = function(pgm) {
  pgm.createIndex('images', 'shop_id', { name: 'images_shop_id', method: 'btree' });

  pgm.createIndex('product_properties', 'taxonomy_id', { name: 'product_properties_taxonomy_id', method: 'btree' });
  pgm.createIndex('product_properties', 'section_id', { name: 'product_properties_section_id', method: 'btree' });
  pgm.createIndex('product_properties', 'tags', { name: 'product_properties_tags', method: 'gin' });
  pgm.createIndex('product_properties', 'materials', { name: 'product_properties_materials', method: 'gin' });
};

exports.down = function(pgm) {
  pgm.dropIndex('images', 'shop_id', { name: 'images_shop_id' });

  pgm.dropIndex('product_properties', 'taxonomy_id', { name: 'product_properties_taxonomy_id' });
  pgm.dropIndex('product_properties', 'section_id', { name: 'product_properties_section_id' });
  pgm.dropIndex('product_properties', 'tags', { name: 'product_properties_tags' });
  pgm.dropIndex('product_properties', 'materials', { name: 'product_properties_materials' });
};
