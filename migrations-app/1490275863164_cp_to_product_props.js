exports.up = function up(pgm) {
  pgm.addColumns('product_properties', {
    channel_listing_id: 'text',
    state: 'text',
    modified_by_hive: 'boolean',
    channel_modification_timestamp: 'timestamp with time zone',
    modification_timestamp: 'timestamp with time zone'
  });
};

exports.down = function down(pgm) {
  pgm.dropColumns('product_properties', [
    'channel_listing_id',
    'state',
    'modified_by_hive',
    'channel_modification_timestamp',
    'modification_timestamp'
  ]);
};
