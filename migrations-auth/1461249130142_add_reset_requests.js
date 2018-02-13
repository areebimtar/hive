var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  // Create reset_requests table
  pgm.sql('CREATE SEQUENCE reset_requests_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('reset_requests', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('reset_requests_id_seq'::regclass)`), notNull: true, unique: true, primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users (id) ON DELETE CASCADE'},
    link_data: { type: 'text', notNull: true },
    created_at: { type: 'timestamp with time zone', default: new PgLiteral('now()') }
  });
};

exports.down = function(pgm) {
  pgm.dropTable('reset_requests');
  pgm.sql('DROP SEQUENCE reset_requests_id_seq');
};
