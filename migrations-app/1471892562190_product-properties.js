exports.up = function(pgm) {
  pgm.createTable( 'product_properties' , {
    id: { type: 'serial', primaryKey: true },
    shop_id: { type: 'bigint', notNull: true },
    _hive_is_invalid: { type: 'boolean' }
  });
  pgm.createIndex('product_properties', ['shop_id'], { name: 'product_properties_shop_id', method: 'btree' });

  pgm.sql("INSERT INTO product_properties (id,shop_id,_HIVE_is_invalid) (SELECT distinct id, shop_id, CAST (property_value as boolean) as _HIVE_is_invalid FROM products WHERE property_name = '_HIVE_is_invalid')");
};

exports.down = function(pgm) {
  pgm.dropTable( 'product_properties' );
};