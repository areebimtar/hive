var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.sql('CREATE SEQUENCE attributes_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('attributes', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('attributes_id_seq'::regclass)`) },
    product_id: { type: 'bigint', notNull: true, references: 'product_properties', onDelete: 'CASCADE' },
    property_id: { type: 'bigint', default: null },
    scale_id: { type: 'bigint', default: null },
    value_ids: { type: 'bigint[]', default: null }
  });
};

exports.down = function(pgm) {
  pgm.dropTable('attributes');
  pgm.sql('DROP SEQUENCE attributes_id_seq');
};
