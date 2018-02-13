exports.up = function(pgm) {
  pgm.sql('ALTER TABLE variations ADD CONSTRAINT variations_product_properties_fkey FOREIGN KEY (product_id) REFERENCES product_properties (id) ON DELETE CASCADE NOT VALID;');
};

exports.down = function(pgm) {
  pgm.sql('ALTER TABLE variations DROP CONSTRAINT variations_product_properties_fkey');
};
