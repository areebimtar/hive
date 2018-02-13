-- Startpoint file for migration of listings files, generated using script migrate-hivedb-data, migrations hash: 12794058f81fa2149227c2e268dc1893
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
SET row_security = off;

--
-- Name: hive_auth; Type: SCHEMA; Schema: -; Owner: hive_qa
--

CREATE SCHEMA hive_auth;


ALTER SCHEMA hive_auth OWNER TO hive_qa;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: postgres_fdw; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS postgres_fdw WITH SCHEMA public;


--
-- Name: EXTENSION postgres_fdw; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgres_fdw IS 'foreign-data wrapper for remote PostgreSQL servers';


SET search_path = public, pg_catalog;

--
-- Name: deletecompany(bigint); Type: FUNCTION; Schema: public; Owner: hive_qa
--

CREATE FUNCTION deletecompany(companyid bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      shopId bigint;
    BEGIN

      -- Remove all associated shops by successively calling deleteshop
      FOR shopId IN SELECT DISTINCT shop.id FROM accounts acc INNER JOIN shops shop ON (acc.id=shop.account_id) WHERE acc.company_id = companyid LOOP
        perform deleteshop(shopId);
      END LOOP;

      DELETE FROM accounts WHERE company_id = companyId;

    END;
    $$;


ALTER FUNCTION public.deletecompany(companyid bigint) OWNER TO hive_qa;

--
-- Name: deleteshop(bigint); Type: FUNCTION; Schema: public; Owner: hive_qa
--

CREATE FUNCTION deleteshop(param_shop_id bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      var_account_id bigint;
      var_shops_count bigint;
    BEGIN
      DELETE FROM images WHERE shop_id = param_shop_id;
      SELECT DISTINCT account_id FROM shops where id = param_shop_id INTO var_account_id;
      SELECT count(*) FROM (SELECT DISTINCT id, account_id FROM shops WHERE account_id=var_account_id) as t1 INTO var_shops_count;
      IF var_shops_count = 1 THEN
        DELETE FROM accounts WHERE id = var_account_id;
      END IF;
      DELETE FROM shops WHERE id = param_shop_id;
    END;
    $$;


ALTER FUNCTION public.deleteshop(param_shop_id bigint) OWNER TO hive_qa;

--
-- Name: trim_queue(integer); Type: FUNCTION; Schema: public; Owner: hive_qa
--

CREATE FUNCTION trim_queue(days integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      DROP TABLE IF EXISTS task_queue_temp;
      CREATE TABLE task_queue_temp AS SELECT * FROM task_queue WHERE created_at >= (CURRENT_DATE - days);
      TRUNCATE task_queue;
    END;
    $$;


ALTER FUNCTION public.trim_queue(days integer) OWNER TO hive_qa;

--
-- Name: upsertproductrow(bigint, bigint, text, text); Type: FUNCTION; Schema: public; Owner: hive_qa
--

CREATE FUNCTION upsertproductrow(pid bigint, sid bigint, pn text, pv text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE products SET property_value=pv, modified_at=now() WHERE id=pid and shop_id=sid and property_name=pn;
      IF NOT FOUND THEN
        INSERT INTO products (id, shop_id, property_name, property_value) VALUES (pid, sid, pn, pv);
      END IF;
    END;
    $$;


ALTER FUNCTION public.upsertproductrow(pid bigint, sid bigint, pn text, pv text) OWNER TO hive_qa;

--
-- Name: upsertuserprofilerow(bigint, text, text); Type: FUNCTION; Schema: public; Owner: hive_qa
--

CREATE FUNCTION upsertuserprofilerow(pid bigint, pn text, pv text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE user_profiles SET property_value=pv, modified_at=now() WHERE user_id=pid and property_name=pn;
      IF NOT FOUND THEN
        INSERT INTO user_profiles (user_id, property_name, property_value) VALUES (pid, pn, pv);
      END IF;
    END;
    $$;


ALTER FUNCTION public.upsertuserprofilerow(pid bigint, pn text, pv text) OWNER TO hive_qa;

--
-- Name: hive_auth_fdw; Type: SERVER; Schema: -; Owner: hive_qa
--

CREATE SERVER hive_auth_fdw FOREIGN DATA WRAPPER postgres_fdw OPTIONS (
    dbname 'hive_qa_0_hive_auth',
    host 'localhost',
    port '5432'
);


ALTER SERVER hive_auth_fdw OWNER TO hive_qa;

--
-- Name: USER MAPPING hive_qa SERVER hive_auth_fdw; Type: USER MAPPING; Schema: -; Owner: hive_qa
--

CREATE USER MAPPING FOR hive_qa SERVER hive_auth_fdw OPTIONS (
    password 'hive_qa',
    "user" 'hive_qa'
);


SET search_path = hive_auth, pg_catalog;

SET default_tablespace = '';

--
-- Name: users; Type: FOREIGN TABLE; Schema: hive_auth; Owner: hive_qa
--

CREATE FOREIGN TABLE users (
    id bigint NOT NULL,
    email text NOT NULL,
    hash text NOT NULL,
    company_id bigint,
    db text NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone,
    first_login timestamp with time zone,
    last_login timestamp with time zone,
    login_count integer,
    admin boolean NOT NULL,
    type text NOT NULL
)
SERVER hive_auth_fdw
OPTIONS (
    schema_name 'public',
    table_name 'users'
);
ALTER FOREIGN TABLE users ALTER COLUMN id OPTIONS (
    column_name 'id'
);
ALTER FOREIGN TABLE users ALTER COLUMN email OPTIONS (
    column_name 'email'
);
ALTER FOREIGN TABLE users ALTER COLUMN hash OPTIONS (
    column_name 'hash'
);
ALTER FOREIGN TABLE users ALTER COLUMN company_id OPTIONS (
    column_name 'company_id'
);
ALTER FOREIGN TABLE users ALTER COLUMN db OPTIONS (
    column_name 'db'
);
ALTER FOREIGN TABLE users ALTER COLUMN first_name OPTIONS (
    column_name 'first_name'
);
ALTER FOREIGN TABLE users ALTER COLUMN last_name OPTIONS (
    column_name 'last_name'
);
ALTER FOREIGN TABLE users ALTER COLUMN created_at OPTIONS (
    column_name 'created_at'
);
ALTER FOREIGN TABLE users ALTER COLUMN first_login OPTIONS (
    column_name 'first_login'
);
ALTER FOREIGN TABLE users ALTER COLUMN last_login OPTIONS (
    column_name 'last_login'
);
ALTER FOREIGN TABLE users ALTER COLUMN login_count OPTIONS (
    column_name 'login_count'
);
ALTER FOREIGN TABLE users ALTER COLUMN admin OPTIONS (
    column_name 'admin'
);
ALTER FOREIGN TABLE users ALTER COLUMN type OPTIONS (
    column_name 'type'
);


ALTER FOREIGN TABLE users OWNER TO hive_qa;

SET search_path = public, pg_catalog;

--
-- Name: account_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE account_id_seq OWNER TO hive_qa;

SET default_with_oids = false;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE accounts (
    id bigint DEFAULT nextval('account_id_seq'::regclass) NOT NULL,
    channel_id bigint NOT NULL,
    company_id bigint NOT NULL,
    oauth_token text,
    oauth_token_secret text
);


ALTER TABLE accounts OWNER TO hive_qa;

--
-- Name: aggregates; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE aggregates (
    shop_id bigint NOT NULL,
    message_id text NOT NULL,
    status text,
    message text,
    parent_message_id text NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE aggregates OWNER TO hive_qa;

--
-- Name: attributes_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE attributes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE attributes_id_seq OWNER TO hive_qa;

--
-- Name: attributes; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE attributes (
    id bigint DEFAULT nextval('attributes_id_seq'::regclass) NOT NULL,
    product_id bigint NOT NULL,
    property_id bigint,
    scale_id bigint,
    value_ids bigint[],
    modified boolean DEFAULT false NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE attributes OWNER TO hive_qa;

--
-- Name: channels; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE channels (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE channels OWNER TO hive_qa;

--
-- Name: image_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE image_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE image_id_seq OWNER TO hive_qa;

--
-- Name: images; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE images (
    id bigint DEFAULT nextval('image_id_seq'::regclass) NOT NULL,
    channel_image_id text,
    thumbnail_url text,
    fullsize_url text,
    vela_image_id bigint,
    shop_id bigint
);


ALTER TABLE images OWNER TO hive_qa;

--
-- Name: pgmigrations; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


ALTER TABLE pgmigrations OWNER TO hive_qa;

--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE pgmigrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE pgmigrations_id_seq OWNER TO hive_qa;

--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hive_qa
--

ALTER SEQUENCE pgmigrations_id_seq OWNED BY pgmigrations.id;


--
-- Name: product_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE product_id_seq OWNER TO hive_qa;

--
-- Name: product_offering_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE product_offering_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE product_offering_id_seq OWNER TO hive_qa;

--
-- Name: product_offering_option_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE product_offering_option_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE product_offering_option_id_seq OWNER TO hive_qa;

--
-- Name: product_offering_options; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE product_offering_options (
    id bigint DEFAULT nextval('product_offering_option_id_seq'::regclass) NOT NULL,
    product_offering_id bigint NOT NULL,
    variation_option_id bigint NOT NULL
);


ALTER TABLE product_offering_options OWNER TO hive_qa;

--
-- Name: product_offerings; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE product_offerings (
    id bigint DEFAULT nextval('product_offering_id_seq'::regclass) NOT NULL,
    product_id bigint NOT NULL,
    price numeric(9,2),
    sku text,
    quantity integer,
    visibility boolean DEFAULT true
);


ALTER TABLE product_offerings OWNER TO hive_qa;

--
-- Name: product_properties; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE product_properties (
    id bigint DEFAULT nextval('product_id_seq'::regclass) NOT NULL,
    shop_id bigint NOT NULL,
    _hive_is_invalid boolean DEFAULT false NOT NULL,
    _hive_invalid_reason text,
    listing_id text,
    state text,
    modified_by_hive boolean,
    last_modified_tsz timestamp with time zone,
    _hive_last_modified_tsz timestamp with time zone,
    photos bigint[] DEFAULT ARRAY[]::bigint[] NOT NULL,
    title text,
    description text,
    creation_tsz timestamp with time zone,
    ending_tsz timestamp with time zone,
    price text,
    quantity text,
    state_tsz timestamp with time zone,
    taxonomy_id bigint,
    section_id text,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    materials text[] DEFAULT ARRAY[]::text[] NOT NULL,
    _hive_on_new_schema boolean DEFAULT false NOT NULL,
    _hive_changed_properties text[] DEFAULT ARRAY[]::text[] NOT NULL,
    _hive_last_sync timestamp with time zone,
    can_write_inventory boolean DEFAULT true NOT NULL
);


ALTER TABLE product_properties OWNER TO hive_qa;

--
-- Name: product_properties_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE product_properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE product_properties_id_seq OWNER TO hive_qa;

--
-- Name: product_properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hive_qa
--

ALTER SEQUENCE product_properties_id_seq OWNED BY product_properties.id;


--
-- Name: shop_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE shop_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE shop_id_seq OWNER TO hive_qa;

--
-- Name: shop_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE shop_sections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE shop_sections_id_seq OWNER TO hive_qa;

--
-- Name: shop_sections; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE shop_sections (
    id bigint DEFAULT nextval('shop_sections_id_seq'::regclass) NOT NULL,
    shop_id bigint NOT NULL,
    section_id bigint,
    value text
);


ALTER TABLE shop_sections OWNER TO hive_qa;

--
-- Name: shopify_products; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE shopify_products (
    id integer NOT NULL,
    shop_id bigint NOT NULL,
    product_id text NOT NULL,
    title text,
    body_html text,
    photos bigint[] DEFAULT ARRAY[]::bigint[] NOT NULL,
    updated_at timestamp with time zone,
    _hive_is_invalid boolean DEFAULT false NOT NULL,
    _hive_invalid_reason text,
    _hive_modified_by_hive boolean DEFAULT false NOT NULL,
    _hive_updated_at timestamp with time zone,
    changed_properties text[] DEFAULT ARRAY[]::text[] NOT NULL,
    last_sync timestamp with time zone,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    product_type text,
    vendor text,
    published_at timestamp with time zone
);


ALTER TABLE shopify_products OWNER TO hive_qa;

--
-- Name: shopify_products_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE shopify_products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE shopify_products_id_seq OWNER TO hive_qa;

--
-- Name: shopify_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hive_qa
--

ALTER SEQUENCE shopify_products_id_seq OWNED BY shopify_products.id;


--
-- Name: shops; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE shops (
    id bigint DEFAULT nextval('shop_id_seq'::regclass) NOT NULL,
    account_id bigint NOT NULL,
    name text,
    channel_shop_id text,
    sync_status text,
    to_download integer DEFAULT 0 NOT NULL,
    downloaded integer DEFAULT 0 NOT NULL,
    to_upload integer DEFAULT 0 NOT NULL,
    uploaded integer DEFAULT 0 NOT NULL,
    rabbit boolean DEFAULT false NOT NULL,
    last_sync_timestamp timestamp with time zone DEFAULT '1999-01-01 00:00:00+01'::timestamp with time zone NOT NULL,
    invalid boolean DEFAULT false,
    error text,
    inventory boolean DEFAULT false NOT NULL,
    applying_operations boolean DEFAULT false NOT NULL,
    to_apply integer DEFAULT 0 NOT NULL,
    applied integer DEFAULT 0 NOT NULL,
    channel_user_id text,
    domain text,
    created_at timestamp with time zone
);


ALTER TABLE shops OWNER TO hive_qa;

--
-- Name: sync_shop; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE sync_shop (
    shop_id bigint NOT NULL,
    product_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE sync_shop OWNER TO hive_qa;

--
-- Name: task_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE task_queue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE task_queue_id_seq OWNER TO hive_qa;

--
-- Name: task_queue; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE task_queue (
    id bigint DEFAULT nextval('task_queue_id_seq'::regclass) NOT NULL,
    company_id bigint NOT NULL,
    channel_id bigint NOT NULL,
    operation text NOT NULL,
    operation_data text,
    created_at timestamp with time zone DEFAULT now(),
    state text,
    state_expires_at timestamp with time zone,
    retry integer DEFAULT 0,
    parent_id bigint,
    suspension_point text,
    result text,
    modified boolean DEFAULT false
);


ALTER TABLE task_queue OWNER TO hive_qa;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE user_profiles (
    user_id bigint NOT NULL,
    property_name text NOT NULL,
    property_value text,
    modified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE user_profiles OWNER TO hive_qa;

--
-- Name: variation_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE variation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE variation_id_seq OWNER TO hive_qa;

--
-- Name: variation_option_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE variation_option_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE variation_option_id_seq OWNER TO hive_qa;

--
-- Name: variation_options; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE variation_options (
    id bigint DEFAULT nextval('variation_option_id_seq'::regclass) NOT NULL,
    variation_id bigint NOT NULL,
    value_id bigint,
    value text NOT NULL,
    formatted_value text,
    price numeric(9,2) DEFAULT NULL::numeric,
    is_available boolean DEFAULT true,
    sequence integer DEFAULT 0
);


ALTER TABLE variation_options OWNER TO hive_qa;

--
-- Name: variations; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE variations (
    id bigint DEFAULT nextval('variation_id_seq'::regclass) NOT NULL,
    product_id bigint NOT NULL,
    first boolean DEFAULT true NOT NULL,
    property_id bigint NOT NULL,
    formatted_name text,
    scaling_option_id bigint,
    recipient_id bigint,
    influences_price boolean DEFAULT false NOT NULL,
    influences_quantity boolean DEFAULT false NOT NULL,
    influences_sku boolean DEFAULT false NOT NULL
);


ALTER TABLE variations OWNER TO hive_qa;

--
-- Name: vela_images_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE vela_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE vela_images_id_seq OWNER TO hive_qa;

--
-- Name: vela_images; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE vela_images (
    id bigint DEFAULT nextval('vela_images_id_seq'::regclass) NOT NULL,
    hash text NOT NULL,
    mime text
);


ALTER TABLE vela_images OWNER TO hive_qa;

--
-- Name: id; Type: DEFAULT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY pgmigrations ALTER COLUMN id SET DEFAULT nextval('pgmigrations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shopify_products ALTER COLUMN id SET DEFAULT nextval('shopify_products_id_seq'::regclass);


--
-- Name: account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('account_id_seq', 1, false);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY accounts (id, channel_id, company_id, oauth_token, oauth_token_secret) FROM stdin;
\.


--
-- Data for Name: aggregates; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY aggregates (shop_id, message_id, status, message, parent_message_id, deleted) FROM stdin;
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
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY channels (id, name) FROM stdin;
1	Etsy
2	Shopify
\.


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
1	1458828094532_init	2018-01-24 15:02:15.791511
2	1459336497279_product_indexes	2018-01-24 15:02:16.091685
3	1460713077982_add_images_rank	2018-01-24 15:02:16.137014
4	1464874232329_shop-sync	2018-01-24 15:02:16.16331
5	1465212619069_shop-sync	2018-01-24 15:02:16.183428
6	1466687725777_upsertUserProfile	2018-01-24 15:02:16.203471
7	1466973228298_delete-shop-function	2018-01-24 15:02:16.278703
8	1471892562190_product-properties	2018-01-24 15:02:16.29377
9	1472502545646_add_invalid_reason	2018-01-24 15:02:16.331365
10	1473284998000_variations	2018-01-24 15:02:16.358425
11	1473752081392_update_delete_function	2018-01-24 15:02:16.468483
12	1475250620932_variations-index	2018-01-24 15:02:16.479403
13	1475760841736_qualifiers	2018-01-24 15:02:16.49862
14	1476021097269_variation-option-ordering	2018-01-24 15:02:16.508695
15	1478538983123_delete_old_tasks	2018-01-24 15:02:16.562523
16	1478698359633_allow-null-for-variation-columns	2018-01-24 15:02:16.573565
17	1479130579702_variation_profile	2018-01-24 15:02:16.583422
18	1480433626850_variation_profile_fix	2018-01-24 15:02:16.678379
19	1480686507630_delete_company	2018-01-24 15:02:16.697686
20	1480939002050_variation_profile_user_to_shop	2018-01-24 15:02:16.71628
21	1480948048903_delete_variation_profiles_with_shop	2018-01-24 15:02:16.727475
22	1481029733717_rabbit-mq-initial-setup	2018-01-24 15:02:16.739215
23	1481213386096_relational-shops-table	2018-01-24 15:02:16.752668
24	1481955443389_relational-accounts	2018-01-24 15:02:16.804496
25	1482276032647_modify-shops-types	2018-01-24 15:02:16.845315
26	1482397615466_invalid_shop	2018-01-24 15:02:16.957538
27	1483554697694_shops-accounts-foreign-keys	2018-01-24 15:02:17.027936
28	1483627651053_fkey-profiles-to-shops	2018-01-24 15:02:17.05317
29	1484149648480_product-offerings	2018-01-24 15:02:17.067106
30	1484646869150_duplicate-sections	2018-01-24 15:02:17.195222
31	1485943965536_shop-inventory-flag	2018-01-24 15:02:17.204424
32	1486060157624_variations-to-product-properties-fkey	2018-01-24 15:02:17.244228
33	1486856024144_product_properties_indexes	2018-01-24 15:02:17.254442
34	1487302640725_drop-variations-property-dict-table	2018-01-24 15:02:17.298358
35	1487356007508_drop-not-null-var-opt-is-allowed	2018-01-24 15:02:17.317856
36	1487582355473_offering-visibility	2018-01-24 15:02:17.333368
37	1487968515634_hive-auth-fdw	2018-01-24 15:02:17.410655
38	1490116719275_remove-variation-profiles	2018-01-24 15:02:17.465128
39	1490275863164_cp_to_product_props	2018-01-24 15:02:17.482196
40	1490275863166_cp_to_product_props_migration	2018-01-24 15:02:17.498155
41	1490275863168_delete-shops-update	2018-01-24 15:02:17.512522
42	1494495694331_apply_bulk_ops_stats	2018-01-24 15:02:17.528005
43	1494495694333_product-id-from-product-properties	2018-01-24 15:02:17.582727
44	1496912131744_attributes	2018-01-24 15:02:17.656192
45	1497349750028_hive_auth_fdw_update	2018-01-24 15:02:17.697086
46	1497604214966_attributes_add_modified_deleted_columnd	2018-01-24 15:02:17.71777
47	1499963798338_trim_queue_update	2018-01-24 15:02:17.795663
48	1500987685799_migrate-photos-to-product-properties	2018-01-24 15:02:17.815637
49	1501258054614_remove-product-id-and-rank-from-images	2018-01-24 15:02:17.925505
50	1501596485610_update_images_tables	2018-01-24 15:02:17.943404
51	1501852296703_refactor-products-table	2018-01-24 15:02:17.98223
52	1503940167725_indexes	2018-01-24 15:02:18.085088
53	1504261638978_task_queue_indexes	2018-01-24 15:02:18.145997
54	1504523455898_shopify_products	2018-01-24 15:02:18.207857
55	1505833941495_sync_shop_table	2018-01-24 15:02:18.280947
56	1507021902813_can_write_inventory	2018-01-24 15:02:18.328921
57	1507032533910_channel_user_id	2018-01-24 15:02:18.433227
58	1507210705960_aggregate-table	2018-01-24 15:02:18.448424
59	1508168946693_remove_products_table	2018-01-24 15:02:18.505483
60	1508500900086_channels	2018-01-24 15:02:18.522157
61	1508838784005_aggregetes_parentId	2018-01-24 15:02:18.537056
62	1509454787636_images_channel_image_id	2018-01-24 15:02:18.551891
63	1509456906284_shopify_images_to_photos	2018-01-24 15:02:18.562839
64	1509462149110_shopify_products_tags	2018-01-24 15:02:18.573518
65	1511257459781_shopify-product-type	2018-01-24 15:02:18.679847
66	1511282987837_shopify-vendor	2018-01-24 15:02:18.708853
67	1511779725972_user_type_fdw	2018-01-24 15:02:18.742324
68	1511869398311_shopify_products_published_at	2018-01-24 15:02:18.814074
69	1512658830557_shop_url	2018-01-24 15:02:18.843262
70	1513266233880_aggregations-deleted	2018-01-24 15:02:18.854924
71	1513334304322_vela-image-unique-constrain-on-hash	2018-01-24 15:02:18.916846
72	1516727958724_shops_created_at	2018-01-24 15:02:18.94179
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
-- Data for Name: product_offering_options; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY product_offering_options (id, product_offering_id, variation_option_id) FROM stdin;
\.


--
-- Data for Name: product_offerings; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY product_offerings (id, product_id, price, sku, quantity, visibility) FROM stdin;
\.


--
-- Data for Name: product_properties; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY product_properties (id, shop_id, _hive_is_invalid, _hive_invalid_reason, listing_id, state, modified_by_hive, last_modified_tsz, _hive_last_modified_tsz, photos, title, description, creation_tsz, ending_tsz, price, quantity, state_tsz, taxonomy_id, section_id, tags, materials, _hive_on_new_schema, _hive_changed_properties, _hive_last_sync, can_write_inventory) FROM stdin;
\.


--
-- Name: product_properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('product_properties_id_seq', 1, false);


--
-- Name: shop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('shop_id_seq', 1, false);


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
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY shops (id, account_id, name, channel_shop_id, sync_status, to_download, downloaded, to_upload, uploaded, rabbit, last_sync_timestamp, invalid, error, inventory, applying_operations, to_apply, applied, channel_user_id, domain, created_at) FROM stdin;
\.


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
-- Data for Name: variation_options; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY variation_options (id, variation_id, value_id, value, formatted_value, price, is_available, sequence) FROM stdin;
\.


--
-- Data for Name: variations; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY variations (id, product_id, first, property_id, formatted_name, scaling_option_id, recipient_id, influences_price, influences_quantity, influences_sku) FROM stdin;
\.


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
-- Name: accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: aggregates_message_id_key; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY aggregates
    ADD CONSTRAINT aggregates_message_id_key UNIQUE (message_id);


--
-- Name: attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (id);


--
-- Name: channels_name_key; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_name_key UNIQUE (name);


--
-- Name: channels_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: images_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);


--
-- Name: max_two_props_per_product; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY variations
    ADD CONSTRAINT max_two_props_per_product UNIQUE (product_id, first);


--
-- Name: product_offering_options_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_offering_options
    ADD CONSTRAINT product_offering_options_pkey PRIMARY KEY (id);


--
-- Name: product_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_offerings
    ADD CONSTRAINT product_offerings_pkey PRIMARY KEY (id);


--
-- Name: product_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_properties
    ADD CONSTRAINT product_properties_pkey PRIMARY KEY (id);


--
-- Name: shopify_products_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shopify_products
    ADD CONSTRAINT shopify_products_pkey PRIMARY KEY (id);


--
-- Name: shopify_products_product_id_key; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shopify_products
    ADD CONSTRAINT shopify_products_product_id_key UNIQUE (product_id);


--
-- Name: shops_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: sync_shop_product_id_key; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY sync_shop
    ADD CONSTRAINT sync_shop_product_id_key UNIQUE (product_id);


--
-- Name: task_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_pkey PRIMARY KEY (id);


--
-- Name: unique_channel_listing_id_shop_id; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_properties
    ADD CONSTRAINT unique_channel_listing_id_shop_id UNIQUE (listing_id, shop_id);


--
-- Name: unique_hash; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY vela_images
    ADD CONSTRAINT unique_hash UNIQUE (hash);


--
-- Name: unique_product_id_shop_id; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shopify_products
    ADD CONSTRAINT unique_product_id_shop_id UNIQUE (product_id, shop_id);


--
-- Name: unique_shop_id_message_id; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY aggregates
    ADD CONSTRAINT unique_shop_id_message_id UNIQUE (shop_id, message_id);


--
-- Name: unique_shop_id_product_id; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY sync_shop
    ADD CONSTRAINT unique_shop_id_product_id UNIQUE (shop_id, product_id);


--
-- Name: user_profiles_unique; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY user_profiles
    ADD CONSTRAINT user_profiles_unique UNIQUE (user_id, property_name);


--
-- Name: variation_options_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY variation_options
    ADD CONSTRAINT variation_options_pkey PRIMARY KEY (id);


--
-- Name: variations_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY variations
    ADD CONSTRAINT variations_pkey PRIMARY KEY (id);


--
-- Name: images_shop_id; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX images_shop_id ON images USING btree (shop_id);


--
-- Name: product_offerings_option_product_offering_id_index; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_offerings_option_product_offering_id_index ON product_offering_options USING btree (product_offering_id);


--
-- Name: product_offerings_option_variation_option_id_index; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_offerings_option_variation_option_id_index ON product_offering_options USING btree (variation_option_id);


--
-- Name: product_offerings_product_id_index; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_offerings_product_id_index ON product_offerings USING btree (product_id);


--
-- Name: product_properties_materials; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_properties_materials ON product_properties USING gin (materials);


--
-- Name: product_properties_section_id; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_properties_section_id ON product_properties USING btree (section_id);


--
-- Name: product_properties_shop_id; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_properties_shop_id ON product_properties USING btree (shop_id);


--
-- Name: product_properties_tags; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_properties_tags ON product_properties USING gin (tags);


--
-- Name: product_properties_taxonomy_id; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX product_properties_taxonomy_id ON product_properties USING btree (taxonomy_id);


--
-- Name: shopify_products_product_type; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX shopify_products_product_type ON shopify_products USING btree (product_type);


--
-- Name: shopify_products_published_at; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX shopify_products_published_at ON shopify_products USING btree (published_at);


--
-- Name: shopify_products_tags; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX shopify_products_tags ON shopify_products USING gin (tags);


--
-- Name: shopify_products_vendor; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX shopify_products_vendor ON shopify_products USING btree (vendor);


--
-- Name: task_queue_created_at; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX task_queue_created_at ON task_queue USING btree (created_at);


--
-- Name: task_queue_operation; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX task_queue_operation ON task_queue USING btree (operation);


--
-- Name: task_queue_parent_id; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX task_queue_parent_id ON task_queue USING btree (parent_id);


--
-- Name: task_queue_state; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX task_queue_state ON task_queue USING btree (state);


--
-- Name: user_profiles_id; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX user_profiles_id ON user_profiles USING btree (user_id);


--
-- Name: variation_options_index; Type: INDEX; Schema: public; Owner: hive_qa
--

CREATE INDEX variation_options_index ON variation_options USING btree (variation_id);


--
-- Name: account_channel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY accounts
    ADD CONSTRAINT account_channel_fkey FOREIGN KEY (channel_id) REFERENCES channels(id) NOT VALID;


--
-- Name: aggregates_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY aggregates
    ADD CONSTRAINT aggregates_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;


--
-- Name: attributes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY attributes
    ADD CONSTRAINT attributes_product_id_fkey FOREIGN KEY (product_id) REFERENCES product_properties(id) ON DELETE CASCADE;


--
-- Name: images_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY images
    ADD CONSTRAINT images_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id);


--
-- Name: product_offering_options_product_offering_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_offering_options
    ADD CONSTRAINT product_offering_options_product_offering_fkey FOREIGN KEY (product_offering_id) REFERENCES product_offerings(id) ON DELETE CASCADE;


--
-- Name: product_offering_options_variation_options_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_offering_options
    ADD CONSTRAINT product_offering_options_variation_options_fkey FOREIGN KEY (variation_option_id) REFERENCES variation_options(id) ON DELETE CASCADE;


--
-- Name: product_offerings_product_properties_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_offerings
    ADD CONSTRAINT product_offerings_product_properties_fkey FOREIGN KEY (product_id) REFERENCES product_properties(id) ON DELETE CASCADE;


--
-- Name: product_properties_shop_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY product_properties
    ADD CONSTRAINT product_properties_shop_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE NOT VALID;


--
-- Name: shop_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shops
    ADD CONSTRAINT shop_account_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE NOT VALID;


--
-- Name: shop_sections_shop_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shop_sections
    ADD CONSTRAINT shop_sections_shop_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE NOT VALID;


--
-- Name: shopify_products_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY shopify_products
    ADD CONSTRAINT shopify_products_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;


--
-- Name: sync_shop_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY sync_shop
    ADD CONSTRAINT sync_shop_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;


--
-- Name: task_queue_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id);


--
-- Name: task_queue_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES task_queue(id) ON DELETE CASCADE;


--
-- Name: variation_options_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY variation_options
    ADD CONSTRAINT variation_options_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE;


--
-- Name: variations_product_properties_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY variations
    ADD CONSTRAINT variations_product_properties_fkey FOREIGN KEY (product_id) REFERENCES product_properties(id) ON DELETE CASCADE NOT VALID;


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


SET search_path = hive_auth, pg_catalog;

--
-- Name: users; Type: ACL; Schema: hive_auth; Owner: hive_qa
--

REVOKE ALL ON TABLE users FROM PUBLIC;
REVOKE ALL ON TABLE users FROM hive_qa;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE users TO hive_qa;


--
-- PostgreSQL database dump complete
--

