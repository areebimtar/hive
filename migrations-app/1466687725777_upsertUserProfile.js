var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.addColumns('user_profiles', {
    modified_at: { type: 'timestamp with time zone', default: new PgLiteral('now()') }
  });
  pgm.addConstraint('user_profiles', 'user_profiles_unique', 'UNIQUE (user_id, property_name)');
  pgm.createIndex('user_profiles', ['user_id'], {name: 'user_profiles_id', method: 'btree', concurently: true} );
  pgm.sql(`CREATE OR REPLACE FUNCTION upsertUserProfileRow(pid bigint, pn text, pv text)
    RETURNS void AS
    $$
    BEGIN
      UPDATE user_profiles SET property_value=pv, modified_at=now() WHERE user_id=pid and property_name=pn;
      IF NOT FOUND THEN
        INSERT INTO user_profiles (user_id, property_name, property_value) VALUES (pid, pn, pv);
      END IF;
    END;
    $$
    LANGUAGE 'plpgsql' VOLATILE;
  `);
};

exports.down = function(pgm) {
  pgm.sql('DROP FUNCTION upsertUserProfileRow(pid bigint, pn text, pv text)');
  pgm.dropIndex('user_profiles', ['user_id'], {name: 'user_profiles_id' });
  pgm.dropConstraint('user_profiles', 'user_profiles_unique');
  pgm.dropColumns('user_profiles', ['modified_at']);
};
