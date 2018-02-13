const PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;



function generateUpdateSql(newColumnName, oldPropertyName, convertToNumber, convertToTimestamp) {
  let value = 'so.property_value';
  if (convertToNumber || convertToTimestamp) {
    value = `to_number(${value}, '999999999999')`;
  }

  if (convertToTimestamp) {
    value = `to_timestamp(${value})`;
  }

  return `UPDATE shops s SET ${newColumnName} = ${value} FROM shops_old so WHERE s.id = so.id AND so.property_name = '${oldPropertyName}'`;
}

exports.up = function(pgm) {
  pgm.sql('ALTER TABLE shops RENAME TO shops_old;');
  pgm.createTable('shops', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('shop_id_seq'::regclass)`) },
    account_id: { type: 'bigint', notNull: true },
    name: { type: 'text'},
    channel_shop_id: { type: 'text' },
    sync_status: { type: 'text' },
    to_download: { type: 'bigint', default: 0, notNull: true },
    downloaded: { type: 'bigint', default: 0, notNull: true },
    to_upload: { type: 'bigint', default: 0, notNull: true },
    uploaded: { type: 'bigint', default: 0, notNull: true },
    rabbit: { type: 'boolean', default: false, notNull: true },
    last_sync_timestamp: { type: 'bigint', default: 0, notNull: true }
  });

  pgm.sql(`INSERT INTO shops
    SELECT DISTINCT id, account_id, property_value as name
    FROM shops_old
    WHERE property_name = 'name';`);

  pgm.sql(generateUpdateSql('channel_shop_id', 'channelShopId'));
  pgm.sql(generateUpdateSql('sync_status', '_sync'));
  pgm.sql(generateUpdateSql('to_upload', '_to_upload', true));
  pgm.sql(generateUpdateSql('to_download', '_to_download', true));
  pgm.sql(generateUpdateSql('downloaded', '_downloaded', true));
  pgm.sql(generateUpdateSql('uploaded', '_uploaded', true));
  pgm.sql(generateUpdateSql('last_sync_timestamp', '_lastSyncAttempt', true));

  pgm.dropTable('shops_old');
};

exports.down = function(pgm) {
  pgm.sql('ALTER TABLE shops RENAME TO shops_new;');
  // pgm.sql('ALTER SEQUENCE shop_id_seq RENAME TO shop_new_id_seq;');
  pgm.createTable('shops', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('shop_id_seq'::regclass)`), notNull: true},
    account_id: { type: 'bigint', notNull: true },
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' }
  });

  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, 'name', name FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, 'channelShopId', channel_shop_id FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, '_to_upload', to_upload FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, '_uploaded', uploaded FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, '_to_download', to_download FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, '_downloaded', downloaded FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, '_sync', sync_status FROM shops_new`);
  pgm.sql(`INSERT INTO shops (id, account_id, property_name, property_value) SELECT id, account_id, '_lastSyncAttempt', last_sync_timestamp FROM shops_new`);

  pgm.dropTable('shops_new');
};
