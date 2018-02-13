-- Cleanup data file, migrated using script migrate-hivedb-data, migrations hash: 12794058f81fa2149227c2e268dc1893
BEGIN TRANSACTION;
TRUNCATE accounts CASCADE;
TRUNCATE aggregates CASCADE;
TRUNCATE attributes CASCADE;
TRUNCATE channels CASCADE;
TRUNCATE images CASCADE;
TRUNCATE pgmigrations CASCADE;
TRUNCATE product_offering_options CASCADE;
TRUNCATE product_offerings CASCADE;
TRUNCATE product_properties CASCADE;
TRUNCATE shopify_products CASCADE;
TRUNCATE shops CASCADE;
TRUNCATE shop_sections CASCADE;
TRUNCATE sync_shop CASCADE;
TRUNCATE task_queue CASCADE;
TRUNCATE user_profiles CASCADE;
TRUNCATE variation_options CASCADE;
TRUNCATE variations CASCADE;
TRUNCATE vela_images CASCADE;
COMMIT;

