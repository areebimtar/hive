const PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.sql('ALTER TABLE accounts RENAME TO accounts_old;');
  pgm.createTable('accounts', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('account_id_seq'::regclass)`) },
    channel_id: { type: 'bigint', notNull: true },
    company_id: { type: 'bigint', notNull: true },
    oauth_token: { type: 'text' },
    oauth_token_secret: { type: 'text' }
  });

  pgm.sql(`INSERT INTO accounts
    SELECT DISTINCT id, channel_id, company_id
    FROM accounts_old;`);

  pgm.sql(`UPDATE accounts a SET oauth_token = property_value FROM accounts_old ao WHERE a.id = ao.id AND ao.property_name = 'token'`);
  pgm.sql(`UPDATE accounts a SET oauth_token_secret = property_value FROM accounts_old ao WHERE a.id = ao.id AND ao.property_name = 'tokenSecret'`);
  pgm.dropTable('accounts_old');
};

exports.down = function(pgm) {
  pgm.sql('ALTER TABLE accounts RENAME TO accounts_new;');
  pgm.createTable('accounts', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('account_id_seq'::regclass)`), notNull: true},
    channel_id: { type: 'bigint', notNull: true },
    company_id: { type: 'bigint', notNull: true },
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' }
  });

  pgm.sql(`INSERT INTO accounts (id, channel_id, company_id, property_name, property_value) SELECT id, channel_id, company_id,  'token', oauth_token FROM accounts_new`);
  pgm.sql(`INSERT INTO accounts (id, channel_id, company_id, property_name, property_value) SELECT id, channel_id, company_id, 'tokenSecret', oauth_token_secret FROM accounts_new`);
  pgm.dropTable('accounts_new');
};
