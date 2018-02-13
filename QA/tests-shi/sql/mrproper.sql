-- Hive main
TRUNCATE task_queue CASCADE;
TRUNCATE accounts CASCADE;
TRUNCATE task_queue CASCADE;
TRUNCATE channels CASCADE;
TRUNCATE products CASCADE;
TRUNCATE shop_sections CASCADE;
TRUNCATE shops CASCADE;
TRUNCATE image_data CASCADE;
TRUNCATE images CASCADE;
TRUNCATE user_profiles CASCADE;

DELETE FROM task_queue;
DELETE FROM accounts;
DELETE FROM task_queue;
DELETE FROM channels;
DELETE FROM products;
DELETE FROM shop_sections;
DELETE FROM shops;
DELETE FROM image_data;
DELETE FROM images;
DELETE FROM user_profiles;

SELECT pg_catalog.setval('account_id_seq', 1, false);
SELECT pg_catalog.setval('image_id_seq', 1, false);
SELECT pg_catalog.setval('product_id_seq', 1, false);
SELECT pg_catalog.setval('shop_id_seq', 1, false);
SELECT pg_catalog.setval('shop_sections_id_seq', 1, false);
SELECT pg_catalog.setval('task_queue_id_seq', 1, false);

INSERT INTO channels (id, name) VALUES (1, 'Etsy');

