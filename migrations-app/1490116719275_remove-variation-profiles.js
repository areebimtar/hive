var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.dropTable(`profile_variation_options`);
  pgm.sql('DROP SEQUENCE profile_variation_option_id_seq');
  pgm.dropTable(`profile_variations`);
  pgm.sql('DROP SEQUENCE profile_variation_id_seq');
  pgm.dropTable(`profiles`);
  pgm.sql('DROP SEQUENCE profile_id_seq');
};

exports.down = function(pgm) {
  // variation entries for individual profiles
  pgm.sql('CREATE SEQUENCE profile_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('profiles', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('profile_id_seq'::regclass)`) },
    shop_id: { type: 'bigint', notNull: true },
    name: { type: 'text', default: null },
    recipient: { type: 'text', default: null },
    taxonomy_id: { type: 'bigint', default: null }
  });
  pgm.sql('ALTER TABLE profiles ADD CONSTRAINT profile_shop_fkey FOREIGN KEY (shop_id) references shops (id) ON DELETE CASCADE NOT VALID');

  pgm.sql('CREATE SEQUENCE profile_variation_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('profile_variations', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('profile_variation_id_seq'::regclass)`) },
    profile_id: { type: 'bigint', notNull: true, references: 'profiles (id) ON DELETE CASCADE' },
    first: { type: 'boolean', default: true, notNull: true },
    property_id: { type: 'bigint', notNull: true },
    formatted_name: { type: 'text', default: null },
    scaling_option_id: { type: 'bigint', default: null }
  });
  pgm.addConstraint('profile_variations', 'max_two_props_per_variation_profile', 'UNIQUE (profile_id, first)');

  pgm.sql('CREATE SEQUENCE profile_variation_option_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('profile_variation_options', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('profile_variation_option_id_seq'::regclass)`) },
    variation_id: { type: 'bigint', notNull: true, references: 'profile_variations (id) ON DELETE CASCADE' },
    value_id: { type: 'bigint' },
    value: { type: 'text', notNull: true},
    formatted_value: { type: 'text', default: null },
    price: { type: 'numeric(9,2)', default: null },
    is_available: { type: 'boolean', notNull: true, default: true },
    sequence: { type: 'integer', default: 0 }
  });
};
