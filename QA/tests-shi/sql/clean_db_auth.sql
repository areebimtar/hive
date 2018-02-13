-- Cleanup data file, migrated using script migrate-hivedb-data, migrations hash: cda81e2f3781374c1d2e4a4a72d1642e
BEGIN TRANSACTION;
TRUNCATE companies CASCADE;
TRUNCATE pgmigrations CASCADE;
TRUNCATE request_info CASCADE;
TRUNCATE reset_requests CASCADE;
TRUNCATE session CASCADE;
TRUNCATE users CASCADE;
COMMIT;

