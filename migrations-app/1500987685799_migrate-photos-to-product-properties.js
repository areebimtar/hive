exports.up = function(pgm) {
  pgm.addColumns('product_properties', {
    photos: { type: 'bigint[]', notNull: true, default: pgm.func('ARRAY[]::bigint[]') }
  });

  pgm.sql(`
    UPDATE product_properties
    SET photos=subquery.photos
    FROM
      (SELECT id, array_agg(elements::text::int) photos
        FROM products, json_array_elements(property_value::json) elements
        WHERE property_name='_HIVE_photos'
        GROUP BY id) subquery
    WHERE product_properties.id=subquery.id;`);
};

exports.down = function(pgm) {
  pgm.dropColumns('product_properties', ['photos']);
};
