exports.up = function(pgm) {
  pgm.addColumns('product_properties', {
    can_write_inventory: { type: 'boolean', notNull: true, default: true }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('product_properties', ['can_write_inventory']);
};
