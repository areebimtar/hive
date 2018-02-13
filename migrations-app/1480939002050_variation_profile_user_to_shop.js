exports.up = function(pgm) {
  // user can have multiple shops, we cannot know to which shop we should
  // add these profiles
  pgm.sql('DELETE FROM profiles');
  // we cannot use REFERENCES as shops.id is not UNIQUE (simple renaming is enough)
  pgm.renameColumn('profiles', 'user_id', 'shop_id');
};

exports.down = function(pgm) {
  pgm.sql('DELETE FROM profiles');
  pgm.renameColumn('profiles', 'shop_id', 'user_id');
};
