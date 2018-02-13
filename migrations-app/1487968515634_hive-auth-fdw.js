/*

  This migration assumes some pre-requisites have been handled on the target database. These should be run
  at the same time that the database and user itself were created (or patched later).

  Summary of pre-requisites:

   1. A superuser has already created the postgres_fdw extension on the target DB;
      for example:

        CREATE EXTENSION IF NOT EXISTS postgres_fdw;

   2. The superuser has granted usage on this extension to user specified in the DATABASE_URL (typically "hive")
      for example:

        GRANT USAGE ON FOREIGN DATA WRAPPER postgres_fdw to hive;

   3. The superuser has granted rights to create schemas to the user.  E.g.

        GRANT CREATE ON DATABASE hive TO hive;

   4. The name of the auth database is the name of the app database + "_auth" (e.g. hive & hive_auth) and it's on the
      same host as the app database this migration is running on.

   5. The user name and password of the user on the hive_auth database match the ones passed in on the DATABASE_URL
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
    CREATE SERVER hive_auth_fdw
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (dbname '${authDbName}', host '${authDbHost}', port '${authDbPort}');

    CREATE USER MAPPING FOR ${dbUserName}
      SERVER hive_auth_fdw
      OPTIONS (user '${authDbUserName}', password '${authDbPassword}');

    CREATE SCHEMA hive_auth;

    IMPORT FOREIGN SCHEMA public LIMIT TO (users) FROM SERVER hive_auth_fdw INTO hive_auth;

    REVOKE ALL ON hive_auth.users FROM ${dbUserName};

    GRANT SELECT ON hive_auth.users TO ${dbUserName};`
  );
};

exports.down = function(pgm) {
  pgm.sql(`DROP SERVER hive_auth_fdw CASCADE`);
  pgm.sql(`DROP SCHEMA hive_auth`);
};
