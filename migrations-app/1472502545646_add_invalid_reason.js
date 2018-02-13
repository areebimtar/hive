exports.up = function(pgm) {
  pgm.addColumn('product_properties', {
    _hive_invalid_reason: { type: 'text' }
  });
};