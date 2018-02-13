exports.up = function up(pgm) {
  pgm.alterColumn('variation_options', 'is_available', { notNull: false, type: 'boolean' });
};

exports.down = function down(pgm) {
  pgm.sql(`
    UPDATE variation_options
    SET is_available = TRUE
    WHERE is_available is null
  `);
  pgm.alterColumn('variation_options', 'is_available', {notNull: true, type: 'boolean', default: true});
};
