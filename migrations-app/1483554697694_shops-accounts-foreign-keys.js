exports.up = function(pgm) {
  pgm.sql('ALTER TABLE accounts ADD CONSTRAINT account_channel_fkey FOREIGN KEY (channel_id) references channels (id) NOT VALID');
  pgm.sql('ALTER TABLE shops ADD CONSTRAINT shop_account_fkey FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE NOT VALID;');
  pgm.sql('ALTER TABLE products ADD CONSTRAINT product_shop_fkey FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE NOT VALID;');
  pgm.sql('ALTER TABLE product_properties ADD CONSTRAINT product_properties_shop_fkey FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE NOT VALID;');
  pgm.sql('ALTER TABLE shop_sections ADD CONSTRAINT shop_sections_shop_fkey FOREIGN KEY (shop_id) references shops(id) ON DELETE CASCADE NOT VALID;');
};

exports.down = function(pgm) {
  pgm.sql('ALTER TABLE accounts DROP CONSTRAINT account_channel_fkey');
  pgm.sql('ALTER TABLE shops DROP CONSTRAINT shop_account_fkey');
  pgm.sql('ALTER TABLE products DROP CONSTRAINT product_shop_fkey');
  pgm.sql('ALTER TABLE product_properties DROP CONSTRAINT product_properties_shop_fkey');
  pgm.sql('ALTER TABLE shop_sections DROP CONSTRAINT shop_sections_shop_fkey');
};
