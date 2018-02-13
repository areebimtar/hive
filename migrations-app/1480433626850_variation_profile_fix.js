exports.up = function(pgm) {
  pgm.dropColumns('profiles', ['scaling_option_id']);
  pgm.addColumns('profile_variations', { scaling_option_id: { type: 'bigint', default: null } });
};

exports.down = function(pgm) {
  pgm.addColumns('profiles', [{ scaling_option_id: { type: 'bigint', default: null } }]);
  pgm.dropColumns('profile_variations', ['scaling_option_id']);
};
