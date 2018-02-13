#!/usr/bin/python3
import argparse

USR_COUNT = 0
VARIATIONS_PER_PRODUCT = 6
PRODUCT_COUNT = 500

HEADERS = r"""
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, pg_catalog;
"""
CLEANUP = """
BEGIN TRANSACTION;
DELETE FROM task_queue;
DELETE FROM accounts;
DELETE FROM task_queue;
DELETE FROM channels;
DELETE FROM product_variations;
DELETE FROM products;
DELETE FROM shop_sections;
DELETE FROM shops;
DELETE FROM variation_combinations;
DELETE FROM variations;
DELETE FROM image_data;
DELETE FROM images;
DELETE FROM user_profiles;
COMMIT;
DELETE FROM task_queue;
"""

parser = argparse.ArgumentParser()
parser.add_argument("--shop-count", required=True)
args = parser.parse_args()
USR_COUNT = int(args.shop_count)


    # Structure
print(HEADERS)
print(CLEANUP)

    # Channels
print(r"""
--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY channels (id, name) FROM stdin;
1	Etsy
\.""")

    # Accounts
print(r"SELECT pg_catalog.setval('account_id_seq', " + str(USR_COUNT) + ", true);")
print(r'COPY accounts (id, company_id, channel_id, property_name, property_value) FROM stdin;')
for i in range(1, USR_COUNT + 1):
    print(str(i) + '	' + str(i) + '	1	token	MyAccesToken1')
    print(str(i) + '	' + str(i) + '	1	tokenSecret	MyAccessTokenSecret1')
print(r'\.')

    # Image data
print(r"""
--
-- Data for Name: image_data; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY image_data (image_id, image, mime, filename) FROM stdin;
\.
""")

print(r"SELECT pg_catalog.setval('image_id_seq', " + str(PRODUCT_COUNT * USR_COUNT) + ", true);")
print(r"""
--
-- Data for Name: images; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY images (id, product_id, channel_image_id, thumbnail_url, fullsize_url, rank) FROM stdin;""")

for i in range(1, (PRODUCT_COUNT * USR_COUNT) + 1):
    print(str(i) + '\t' + str(i) + '\t' + r'865542738	https://img0.etsystatic.com/110/0/11980898/il_75x75.865542738_jgog.jpg	https://img0.etsystatic.com/110/0/11980898/il_fullxfull.865542738_jgog.jpg	1')
print(r'\.')
print(r"SELECT pg_catalog.setval('product_id_seq', " + str(USR_COUNT) + ", true);")

    # Product variations
var_cnt = USR_COUNT * VARIATIONS_PER_PRODUCT * PRODUCT_COUNT
print(r"SELECT pg_catalog.setval('product_variation_id_seq', " + str(var_cnt) + ", true);")
print(r'COPY product_variations (id, variation_combination_id, property_name, property_value) FROM stdin;')
for i in range(1, var_cnt + 1):
    print(str(i) + '\t' + str(i) + '\t' + 'is_available	true')
    print(str(i) + '\t' + str(i) + '\t' + 'price	5.15')
print(r'\.')


    # Products
print(r"""
--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY products (id, shop_id, property_name, property_value, modified_at) FROM stdin;""")

prod_variation = 1; product_id = 1
for shop in range(1, USR_COUNT + 1):
    for product in range(PRODUCT_COUNT):
        print(str(product_id) + '\t' + str(shop) + '\t' + r'listing_id	' + '{:04d}'.format(product_id) + '	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'title	Best gadget ' + '{:04d}'.format(product_id) + '	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'category_path	["Art"]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'category_path_ids	[68887312]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'category_id	68933642	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'recipient	men	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'occasion	anniversary	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'non_taxable	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'file_data		2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'used_manufacturer	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'ending_tsz	1460803506	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'who_made	i_did	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'original_creation_tsz	1450266306	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'state	active	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'description	invisible gloves	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'last_modified_tsz	1450269283	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'is_private	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'should_auto_renew	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'url	https://www.etsy.com/listing/260850358/nothing-to-see-here2?utm_source=etsytestapp&utm_medium=api&utm_campaign=api	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'quantity	1	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'language	en-US	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'is_supply	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'num_favorers	0	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'when_made	before_1996	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'taxonomy_id	1490	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'state_tsz	1450266306	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'taxonomy_path	["Shoes","Unisex Adult Shoes","Boots","Walking & Hiking Boots"]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'price	5.15	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'user_id	75630222	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'has_variations	true	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'currency_code	CZK	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'is_customizable	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'is_digital	false	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'creation_tsz	1450266306	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'views	0	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'_HIVE_thumbnails_url	https://img0.etsystatic.com/110/0/11980898/il_75x75.865542738_jgog.jpg	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'_HIVE_top_category	Clothing	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'tags	["Tag01","Tag02","Tag03"]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'materials	["wool","cotton"]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'style	["Geek","Sport"]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'variation	' + str(prod_variation) + '	2016-03-31 15:43:17.11947+00'); prod_variation += 1
        print(str(product_id) + '\t' + str(shop) + '\t' + r'variation	' + str(prod_variation) + '	2016-03-31 15:43:17.11947+00'); prod_variation += 1
        print(str(product_id) + '\t' + str(shop) + '\t' + r'variation	' + str(prod_variation) + '	2016-03-31 15:43:17.11947+00'); prod_variation += 1
        print(str(product_id) + '\t' + str(shop) + '\t' + r'variation	' + str(prod_variation) + '	2016-03-31 15:43:17.11947+00'); prod_variation += 1
        print(str(product_id) + '\t' + str(shop) + '\t' + r'variation	' + str(prod_variation) + '	2016-03-31 15:43:17.11947+00'); prod_variation += 1
        print(str(product_id) + '\t' + str(shop) + '\t' + r'variation	' + str(prod_variation) + '	2016-03-31 15:43:17.11947+00'); prod_variation += 1
        print(str(product_id) + '\t' + str(shop) + '\t' + r'_HIVE_photos	[1]	2016-03-31 15:43:17.11947+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'_HIVE_tags	german	2016-04-26 09:37:44.06121+00')
        print(str(product_id) + '\t' + str(shop) + '\t' + r'_HIVE_variations_with_price	false	2016-04-25 22:12:22.582802+00')
        product_id += 1
print(r'\.')

print(r"""
--
-- Name: shop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive
--

SELECT pg_catalog.setval('shop_id_seq', """ + str(USR_COUNT) + """, true);
""")

    # shop sections
print(r"""
--
-- Data for Name: shop_sections; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY shop_sections (id, shop_id, section_id, value) FROM stdin;""")
i = 0
for section in range(1, USR_COUNT + 1):
    sections = [
        '15183328	On Sale',
        '15180189	Holiday Gifts',
        '17365192	Summer Sale',
        '18790753	de',
        '18787742	bbbaa',
        '18790755	eeee',
    ]
    for s in sections:
        i += 1
        print(str(i) + '\t' + str(section) + '\t' + s)
print(r'\.')


print(r"""
--
-- Name: shop_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive
--

SELECT pg_catalog.setval('shop_sections_id_seq', """ + str(len(sections) * USR_COUNT)+ """, true);
""")


    # Shops
print(r"""
--
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY shops (id, account_id, property_name, property_value) FROM stdin;""")
for shop in range(1, USR_COUNT + 1):
    s = str(shop) 
    print(s + '\t' + s + '\t' + 'channelShopId	8545731')
    print(s + '\t' + s + '\t' + 'name	HiveDemo')
    print(s + '\t' + s + '\t' + '_lastSyncAttempt	1459433943')
    print(s + '\t' + s + '\t' + '_total	500')
    print(s + '\t' + s + '\t' + '_sync	sync')
    print(s + '\t' + s + '\t' + '_done	500')
print(r'\.')


    # task queue
print(r"""
--
-- Data for Name: task_queue; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY task_queue (id, company_id, channel_id, operation, operation_data, created_at, state, state_expires_at, retry, parent_id, suspension_point, result, modified) FROM stdin;
\.


--
-- Name: task_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive
--

SELECT pg_catalog.setval('task_queue_id_seq', 1, true);
""")

    # users
print(r"""
--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY user_profiles (user_id, property_name, property_value) FROM stdin;
\.

""")


    # variations
print(r"""
--
-- Name: variation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive
--

SELECT pg_catalog.setval('variation_id_seq', 5, true);


--
-- Data for Name: variations; Type: TABLE DATA; Schema: public; Owner: hive
--

COPY variations (id, variation_name, variation_value) FROM stdin;
1	Color	Blue
2	Color	Green
3	Color	Red
4	Fabric	wool
5	Fabric	cotton
\.
""")

    # variation_combinations
print(r"""

--
-- Data for Name: variation_combinations; Type: TABLE DATA; Schema: public; Owner: hive
-- (maps product_variation -> variation)

COPY variation_combinations (id, variation_id) FROM stdin;""")
i = 1
for x in range(USR_COUNT * PRODUCT_COUNT):
    print(str(i) + '\t1')
    print(str(i) + '\t4'); i += 1
    print(str(i) + '\t1')
    print(str(i) + '\t5'); i += 1
    print(str(i) + '\t2')
    print(str(i) + '\t4'); i += 1
    print(str(i) + '\t2')
    print(str(i) + '\t5'); i += 1
    print(str(i) + '\t3')
    print(str(i) + '\t4'); i += 1
    print(str(i) + '\t3')
    print(str(i) + '\t5'); i += 1
print(r'\.')
print("""
--
-- Name: variation_combinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive
--

SELECT pg_catalog.setval('variation_combinations_id_seq', """ + str(USR_COUNT * PRODUCT_COUNT * VARIATIONS_PER_PRODUCT) + """, true);
""")

