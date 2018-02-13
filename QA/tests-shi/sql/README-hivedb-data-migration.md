# Migration of test DB data in SQL files
Everytime DB structure changes, test data have to be updated to be compatible with the structure.

Script `migrate-hivedb-data` was created for painless updates of SQL files for *hive* and *auth* databases.

**This script can migrate following files:**

* listing files (test data) for *hive* database - `listings_*.sql`
* auth files (test data) for *auth* database - `auth_*.sql`
* cleanup scripts for *hive* and *auth* databases - `cleanup_db_00.sql` and `cleanup_db_auth.sql`

You can print script's usage by running: `migrate-hivedb-data -h`

## 1 Performing the migration

Follow these steps for migrating SQL files, for more information about *migration startpoint file* see [2 Migration startpoint file](#2-migration-startpoint-file)

**Prerequisites:**

* *migration startpoint files* `migration_startpoint_hivedb.sql` and `migration_startpoint_authdb.sql` are present and reflect SQL files we want to migrate.

**Steps to migrate SQL files:**

1. Checkout from repository the Hive version that has DB structure you want to *migrate to*
* Build this Hive version using `qa-build`
* Run migration of all supported SQL files by running: `migrate-hivedb-data -mw`, this step will:
    * migrate all listings files
    * migrate all auth files
    * migrate hive DB cleanup script
    * migrate auth DB cleanup script
    * generate new migration startpoint files (*hive* and *auth* DBs) for next migration
    * overwrite original SQL files (this can be skipped for testing purposes by omitting `-w` option)

Migrated SQL files should be ready to be commited to repository after the process.

## 2 Migration startpoint file
The migration startpoint files are `migration_startpoint_hivedb.sql` for *hive* database and `migration_startpoint_authdb.sql` for *auth* database.

It is an SQL file that is needed to migrate listings or auth files. It contains "empty" *hive* (*auth*) DB with the same DB structure as in listings (auth) files - we need this file as a startpoint for each listings (auth) file migration, because listings (auth) files contain only data, not complete DB structure.

Migration startpoint file is not needed for migrating DB cleanup file.

If the file is not present or it is outdated it is possible to regenerate it - see [2.2 Generate new startpoint file](#22-generate-new-startpoint-file)

### 2.1 How to verify migration startpoint file

### Using hashes in the files
In the startpoint file there is an SQL comment line that contains hash of all migration operations applied when the file was created, i.e.:

`-- Startpoint file for migration of listings files, generated using script migrate-hivedb-data, migrations hash: f2ec6841c8eff7e7a703de47683f4dec`

When an SQL file is migrated, a similar comment with the hash is also added to the file, i.e.:

`-- Test data listings file, migrated using script migrate-hivedb-data, migrations hash: f2ec6841c8eff7e7a703de47683f4dec`

If these two hashes are the same, it means the same migration operations were applied to generate them. Therefore startpoint file and the SQL file has the same DB structure and listings file can be migrated using this startpoint file.

### By comparing the content of the files

For listings and auth files it is also possible to check the *hive* DB startpoint and listings file (or *auth* DB startpoint and auth file) by comparing their contents - in `pgmigrations` table there should be the same records indicating that the same migration operations were run to produce these files.

### 2.2 Generate new startpoint file
If it is needed to generate new migration startpoint files, follow these steps:

**Steps:**

1. Checkout from repository the Hive version that has DB structure you want to *migrate from*
* Build this Hive version using `qa-build`
* Create the startpoint file by running: `migrate-hivedb-data -sw`, this step will:
    * generate new startpoint files
    * overwrite old startpoint files if present (this can be skipped for testing purposes by omitting `-w` option)

New startpoint files `migration_startpoint_hivedb.sql` and `migration_startpoint_authdb.sql` should be created by the process.


## 3 Notes
* Propertly configured `qa.cfg` file is needed for the process
* Steps that build Hive are neccessary, the script uses Hive's migration scripts that are run from built application
* Other possible uses of `migrate-hivedb-data` script are:
    * migrate only one SQL file using `-f <sql_file>` option
    * if in doubt when running migration, don't overwrite original SQL file(s) by omitting `-w` option
    * if original SQL files are not overwritten, it is possible to rerun the migration
