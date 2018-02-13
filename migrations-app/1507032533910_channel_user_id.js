exports.up = function(pgm) {
  pgm.addColumns('shops', {
    channel_user_id: { type: 'text' }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('shops', ['channel_user_id']);
};
