-- Test data listings file, migrated using script migrate-hivedb-data, migrations hash: 12794058f81fa2149227c2e268dc1893
--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.9
-- Dumped by pg_dump version 9.5.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

SET search_path = public, pg_catalog;
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


--
-- Name: account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('account_id_seq', 1, true);


--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY channels (id, name) FROM stdin;
1	Etsy
2	Shopify
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY accounts (id, channel_id, company_id, oauth_token, oauth_token_secret) FROM stdin;
\.


--
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY shops (id, account_id, name, channel_shop_id, sync_status, to_download, downloaded, to_upload, uploaded, rabbit, last_sync_timestamp, invalid, error, inventory, applying_operations, to_apply, applied, channel_user_id, domain, created_at) FROM stdin;
\.


--
-- Data for Name: aggregates; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY aggregates (shop_id, message_id, status, message, parent_message_id, deleted) FROM stdin;
\.


--
-- Data for Name: product_properties; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY product_properties (id, shop_id, _hive_is_invalid, _hive_invalid_reason, listing_id, state, modified_by_hive, last_modified_tsz, _hive_last_modified_tsz, photos, title, description, creation_tsz, ending_tsz, price, quantity, state_tsz, taxonomy_id, section_id, tags, materials, _hive_on_new_schema, _hive_changed_properties, _hive_last_sync, can_write_inventory) FROM stdin;
\.


--
-- Data for Name: attributes; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY attributes (id, product_id, property_id, scale_id, value_ids, modified, deleted) FROM stdin;
\.


--
-- Name: attributes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('attributes_id_seq', 1, false);


--
-- Name: image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('image_id_seq', 1, false);


--
-- Data for Name: images; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY images (id, channel_image_id, thumbnail_url, fullsize_url, vela_image_id, shop_id) FROM stdin;
\.


--
-- Data for Name: pgmigrations; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY pgmigrations (id, name, run_on) FROM stdin;
1	1458828094532_init	2016-12-22 13:53:57.158213
2	1459336497279_product_indexes	2016-12-22 13:53:57.454994
3	1460713077982_add_images_rank	2016-12-22 13:53:57.527188
4	1464874232329_shop-sync	2016-12-22 13:53:57.555215
5	1465212619069_shop-sync	2016-12-22 13:53:57.572069
6	1466687725777_upsertUserProfile	2016-12-22 13:53:57.588907
7	1466973228298_delete-shop-function	2016-12-22 13:53:57.676386
8	1471892562190_product-properties	2016-12-22 13:53:57.690679
9	1472502545646_add_invalid_reason	2016-12-22 13:53:57.745064
10	1473284998000_variations	2016-12-22 13:53:57.77255
11	1473752081392_update_delete_function	2016-12-22 13:53:57.888543
12	1475250620932_variations-index	2016-12-22 13:53:57.902625
13	1475760841736_qualifiers	2016-12-22 13:53:57.930332
14	1476021097269_variation-option-ordering	2016-12-22 13:53:57.943703
15	1478538983123_delete_old_tasks	2016-12-22 13:53:58.023782
16	1478698359633_allow-null-for-variation-columns	2016-12-22 13:53:58.038505
17	1479130579702_variation_profile	2016-12-22 13:53:58.054878
18	1480433626850_variation_profile_fix	2016-12-22 13:53:58.203941
19	1480686507630_delete_company	2016-12-22 13:53:58.222261
20	1480939002050_variation_profile_user_to_shop	2016-12-22 13:53:58.236255
21	1480948048903_delete_variation_profiles_with_shop	2016-12-22 13:53:58.250712
22	1481029733717_rabbit-mq-initial-setup	2016-12-22 13:53:58.314847
23	1481213386096_relational-shops-table	2016-12-22 13:53:58.328947
24	1481955443389_relational-accounts	2016-12-22 13:53:58.38495
25	1482276032647_modify-shops-types	2016-12-22 13:53:58.428579
26	1482397615466_invalid_shop	2017-02-08 21:32:40.748087
27	1483554697694_shops-accounts-foreign-keys	2017-02-08 21:32:40.795615
28	1483627651053_fkey-profiles-to-shops	2017-02-08 21:32:40.815464
29	1484149648480_product-offerings	2017-02-08 21:32:40.82776
30	1484646869150_duplicate-sections	2017-02-08 21:32:40.958559
31	1485943965536_shop-inventory-flag	2017-02-08 21:32:40.969876
32	1486060157624_variations-to-product-properties-fkey	2017-02-08 21:32:41.02642
33	1486856024144_product_properties_indexes	2017-02-13 12:31:40.209761
34	1487302640725_drop-variations-property-dict-table	2017-02-17 15:44:35.349498
35	1487356007508_drop-not-null-var-opt-is-allowed	2017-02-17 21:01:57.325744
36	1487582355473_offering-visibility	2017-02-20 17:26:14.262676
37	1487968515634_hive-auth-fdw	2017-02-25 19:51:43.063391
38	1490116719275_remove-variation-profiles	2017-03-23 11:08:42.014639
39	1490275863164_cp_to_product_props	2017-03-29 16:10:37.005265
40	1490275863166_cp_to_product_props_migration	2017-04-04 16:46:26.547909
41	1490275863168_delete-shops-update	2017-04-06 17:41:56.978307
42	1494495694331_apply_bulk_ops_stats	2017-05-15 18:47:37.892799
43	1494495694333_product-id-from-product-properties	2017-05-25 10:35:58.923759
44	1496912131744_attributes	2017-06-12 16:08:20.948168
45	1497349750028_hive_auth_fdw_update	2017-06-15 16:20:09.315038
46	1497604214966_attributes_add_modified_deleted_columnd	2017-06-19 17:53:15.618928
47	1499963798338_trim_queue_update	2017-07-14 09:32:25.329894
48	1500987685799_migrate-photos-to-product-properties	2017-07-27 19:19:54.738367
49	1501258054614_remove-product-id-and-rank-from-images	2017-08-02 11:27:33.105923
50	1501596485610_update_images_tables	2017-08-04 12:32:37.302489
51	1501852296703_refactor-products-table	2017-08-22 12:00:15.922487
52	1503940167725_indexes	2017-08-28 19:56:09.095218
53	1504261638978_task_queue_indexes	2017-09-01 13:29:10.798546
54	1504523455898_shopify_products	2017-09-22 12:29:29.387827
55	1505833941495_sync_shop_table	2017-09-26 12:13:11.194699
56	1507021902813_can_write_inventory	2017-10-03 13:45:06.925014
57	1507032533910_channel_user_id	2017-10-04 11:11:39.524652
58	1507210705960_aggregate-table	2017-10-09 16:24:52.187799
59	1508168946693_remove_products_table	2017-10-16 19:06:29.15496
60	1508500900086_channels	2017-10-27 23:14:32.595627
61	1508838784005_aggregetes_parentId	2017-10-31 11:11:29.708668
62	1509454787636_images_channel_image_id	2017-11-09 23:10:22.427658
63	1509456906284_shopify_images_to_photos	2017-11-09 23:10:22.439905
64	1509462149110_shopify_products_tags	2017-11-10 14:30:01.223611
65	1511257459781_shopify-product-type	2017-11-21 17:17:39.668858
66	1511282987837_shopify-vendor	2017-11-22 15:06:28.970104
67	1511779725972_user_type_fdw	2017-11-28 11:22:52.499379
68	1511869398311_shopify_products_published_at	2017-12-04 01:22:36.297131
69	1512658830557_shop_url	2017-12-08 09:33:54.197996
70	1513266233880_aggregations-deleted	2017-12-14 19:31:42.833957
71	1513334304322_vela-image-unique-constrain-on-hash	2017-12-15 12:22:42.603648
72	1516727958724_shops_created_at	2018-01-24 15:01:32.791948
\.


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('pgmigrations_id_seq', 72, true);


--
-- Name: product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('product_id_seq', 1, false);


--
-- Name: product_offering_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('product_offering_id_seq', 1, false);


--
-- Name: product_offering_option_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('product_offering_option_id_seq', 1, false);


--
-- Data for Name: product_offerings; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY product_offerings (id, product_id, price, sku, quantity, visibility) FROM stdin;
\.


--
-- Data for Name: variations; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY variations (id, product_id, first, property_id, formatted_name, scaling_option_id, recipient_id, influences_price, influences_quantity, influences_sku) FROM stdin;
\.


--
-- Data for Name: variation_options; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY variation_options (id, variation_id, value_id, value, formatted_value, price, is_available, sequence) FROM stdin;
\.


--
-- Data for Name: product_offering_options; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY product_offering_options (id, product_offering_id, variation_option_id) FROM stdin;
\.


--
-- Name: product_properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('product_properties_id_seq', 1, false);


--
-- Name: shop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('shop_id_seq', 1, true);


--
-- Data for Name: shop_sections; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY shop_sections (id, shop_id, section_id, value) FROM stdin;
\.


--
-- Name: shop_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('shop_sections_id_seq', 1, false);


--
-- Data for Name: shopify_products; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY shopify_products (id, shop_id, product_id, title, body_html, photos, updated_at, _hive_is_invalid, _hive_invalid_reason, _hive_modified_by_hive, _hive_updated_at, changed_properties, last_sync, tags, product_type, vendor, published_at) FROM stdin;
\.


--
-- Name: shopify_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('shopify_products_id_seq', 1, false);


--
-- Data for Name: sync_shop; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY sync_shop (shop_id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: task_queue; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY task_queue (id, company_id, channel_id, operation, operation_data, created_at, state, state_expires_at, retry, parent_id, suspension_point, result, modified) FROM stdin;
\.


--
-- Name: task_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('task_queue_id_seq', 1, false);


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY user_profiles (user_id, property_name, property_value, modified_at) FROM stdin;
1	introVideoModalOpen	false	2016-06-27 15:49:36.972082+02
\.


--
-- Name: variation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('variation_id_seq', 1, false);


--
-- Name: variation_option_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('variation_option_id_seq', 1, false);


--
-- Data for Name: vela_images; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY vela_images (id, hash, mime) FROM stdin;
\.


--
-- Name: vela_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('vela_images_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

COMMIT;
