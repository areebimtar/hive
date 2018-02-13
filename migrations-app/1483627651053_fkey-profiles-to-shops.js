exports.up = function(pgm) {
  pgm.sql('ALTER TABLE profiles ADD CONSTRAINT profile_shop_fkey FOREIGN KEY (shop_id) references shops (id) ON DELETE CASCADE NOT VALID');
};

exports.down = function(pgm) {
  pgm.sql('ALTER TABLE profiles DROP CONSTRAINT profile_shop_fkey');
};
