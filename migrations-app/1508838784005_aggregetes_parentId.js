exports.up = function(pgm) {
  pgm.addColumns('aggregates', {
    parent_message_id: { type: 'text', notNull: true }
  });
};

exports.down = function(pgm) {
  pgm.dropColumns('aggregates', ['parent_message_id']);
};
