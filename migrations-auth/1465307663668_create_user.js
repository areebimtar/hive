var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.renameColumn('users', 'name', 'email');
  pgm.addColumns('users', {
    first_name: { type: 'text'},
    last_name: { type: 'text'},
    created_at: { type: 'timestamp with time zone', default: new PgLiteral('now()') }
  });
  pgm.sql('select setval(\'user_id_seq\', (select max(id) from users))');
  pgm.sql('select setval(\'company_id_seq\', (select max(id) from companies))');
};

exports.down = function(pgm) {
  pgm.dropColumns('users', ['first_name', 'last_name', 'created_at']);
  pgm.renameColumn('users', 'email', 'name');
};
