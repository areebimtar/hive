var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.renameColumn('product_properties', 'channel_modification_timestamp', 'last_modified_tsz');
  pgm.renameColumn('product_properties', 'modification_timestamp', '_hive_last_modified_tsz');

  pgm.dropTable('products');
};

exports.down = function(pgm) {
  pgm.createTable('products', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('product_id_seq'::regclass)`), notNull: true },
    shop_id: { type: 'bigint', notNull: true, references: 'shops (id)' },
    property_name: { type: 'string', notNull: true },
    property_value: { type: 'string' },
    modified_at: { type: 'timestamp with time zone', default: new PgLiteral('now()') }
  });

  pgm.renameColumn('product_properties', 'last_modified_tsz', 'channel_modification_timestamp');
  pgm.renameColumn('product_properties', '_hive_last_modified_tsz', 'modification_timestamp');
};
