exports.up = function(pgm) {
  pgm.addColumns('variations', {
    scaling_option_id: { type: 'bigint' },
    recipient_id: { type: 'bigint' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('variations', ['scaling_option_id', 'recipient_id']);
};
