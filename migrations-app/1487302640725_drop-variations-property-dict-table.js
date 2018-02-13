exports.up = function(pgm) {
  // drop the table and CASCADE drops any foreign keys that reference it
  // (the current status is different in production than in other environments).
  // The "IF EXISTS" allows us to migrate down and back.
  pgm.sql('DROP TABLE IF EXISTS variation_property_dict CASCADE');
};

// Because current data conflicts with the foreign key constraints and because we weren't using this table for anything,
// this down migration intentionally does NOT restore the table. We already removed the fkeys in production as
// a manual fix and trying to restore them would fail.
exports.down = function() {

};
