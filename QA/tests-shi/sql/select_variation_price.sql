-- value_id as defined in listings_10.sql
SELECT value_id, price FROM variation_options WHERE value_id IN ( '2138230766', '1536325354') ORDER BY value_id;
