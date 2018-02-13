/*
  This migration only recreates the foreign data wrapper schema due to update in auth database schema.
*/

// extract the user, password and host name for any of the following acceptable inputs:
//   postgres://user:password@host/dbname
//   postgres://user:password@host:5432/dbname
//   postgresql://user:password@host/dbname
//   postgresql://user:password@host:5432/dbname
const re = /(postgres|postgresql):\/\/(.*):(.*)@([\w\d\.\-]*)(:(.*))?\/(.*)$/;
const dbUrl = process.env.DATABASE_URL;
const dbUserName = dbUrl.replace(re, '$2');
const dbPassword = dbUrl.replace(re, '$3');
const hiveDbName = dbUrl.replace(re, '$7');
const authDbUrl = process.env.AUTH_DATABASE_URL;
const authDbUserName = authDbUrl && authDbUrl.replace(re, '$2') || dbUserName;
const authDbPassword = authDbUrl && authDbUrl.replace(re, '$3') || dbPassword;
const authDbName = authDbUrl && authDbUrl.replace(re, '$7') || `${hiveDbName}_auth`;
const authDbHost = authDbUrl && authDbUrl.replace(re, '$4') || 'localhost';
const authDbPort = authDbUrl && authDbUrl.replace(re, '$6') || 5432;

exports.up = function(pgm) {
  pgm.sql(
    `
    DROP SERVER IF EXISTS hive_auth_fdw CASCADE;

    CREATE SERVER hive_auth_fdw
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (dbname '${authDbName}', host '${authDbHost}', port '${authDbPort}');

    CREATE USER MAPPING FOR ${dbUserName}
      SERVER hive_auth_fdw
      OPTIONS (user '${authDbUserName}', password '${authDbPassword}');

    DROP SCHEMA IF EXISTS hive_auth;

    CREATE SCHEMA hive_auth;

    IMPORT FOREIGN SCHEMA public LIMIT TO (users) FROM SERVER hive_auth_fdw INTO hive_auth;

    REVOKE ALL ON hive_auth.users FROM ${dbUserName};

    GRANT SELECT, INSERT, UPDATE, DELETE ON hive_auth.users TO ${dbUserName};`
  );
};

exports.down = function(pgm) {
  pgm.sql(
    `
    DROP SERVER IF EXISTS hive_auth_fdw CASCADE;

    CREATE SERVER hive_auth_fdw
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (dbname '${authDbName}', host '${authDbHost}', port '${authDbPort}');

    CREATE USER MAPPING FOR ${dbUserName}
      SERVER hive_auth_fdw
      OPTIONS (user '${authDbUserName}', password '${authDbPassword}');

    DROP SCHEMA IF EXISTS hive_auth;

    CREATE SCHEMA hive_auth;

    IMPORT FOREIGN SCHEMA public LIMIT TO (users) FROM SERVER hive_auth_fdw INTO hive_auth;

    REVOKE ALL ON hive_auth.users FROM ${dbUserName};

    GRANT SELECT, INSERT, UPDATE, DELETE ON hive_auth.users TO ${dbUserName};`
  );
};
