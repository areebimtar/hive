
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;


CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;



COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;


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


ALTER FUNCTION public.deletecompany(companyid bigint) OWNER TO hive;


CREATE FUNCTION deleteshop(shopid bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      accountid bigint;
      shops_count bigint;
    BEGIN
      DELETE FROM profiles WHERE shop_id = shopid;
      DELETE FROM images WHERE product_id IN (SELECT id FROM products WHERE shop_id = shopid);
      DELETE FROM product_properties WHERE shop_id = shopid;
      DELETE FROM variations WHERE product_id in  (SELECT id FROM products WHERE shop_id = shopid);
      DELETE FROM products WHERE shop_id = shopid;
      DELETE FROM shop_sections WHERE shop_id = shopid;
      SELECT DISTINCT account_id FROM shops where id = shopid INTO accountid;
      SELECT count(*) FROM (SELECT DISTINCT id, account_id FROM shops WHERE account_id=accountid) as t1 INTO shops_count;
      IF shops_count = 1 THEN
        DELETE FROM accounts WHERE id = accountid;
      END IF;

      DELETE FROM shops WHERE id = shopid;
    END;
    $$;


ALTER FUNCTION public.deleteshop(shopid bigint) OWNER TO hive;


CREATE FUNCTION trim_queue(days integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      CREATE TABLE task_queue_temp AS SELECT * FROM task_queue WHERE created_at >= (CURRENT_DATE - days);
      TRUNCATE task_queue;
      INSERT INTO task_queue SELECT * FROM task_queue_temp;
      DROP TABLE task_queue_temp;
    END;
    $$;


ALTER FUNCTION public.trim_queue(days integer) OWNER TO hive;


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


ALTER FUNCTION public.upsertproductrow(pid bigint, sid bigint, pn text, pv text) OWNER TO hive;


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


ALTER FUNCTION public.upsertuserprofilerow(pid bigint, pn text, pv text) OWNER TO hive;


CREATE SEQUENCE account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE account_id_seq OWNER TO hive;

SET default_tablespace = '';

SET default_with_oids = false;


CREATE TABLE accounts (
    id bigint DEFAULT nextval('account_id_seq'::regclass) NOT NULL,
    company_id bigint NOT NULL,
    channel_id bigint NOT NULL,
    property_name text NOT NULL,
    property_value text
);


ALTER TABLE accounts OWNER TO hive;


CREATE TABLE channels (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE channels OWNER TO hive;


CREATE TABLE image_data (
    image_id bigint NOT NULL,
    image bytea NOT NULL,
    mime text NOT NULL,
    filename text NOT NULL
);


ALTER TABLE image_data OWNER TO hive;


CREATE SEQUENCE image_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE image_id_seq OWNER TO hive;


CREATE TABLE images (
    id bigint DEFAULT nextval('image_id_seq'::regclass) NOT NULL,
    product_id bigint NOT NULL,
    channel_image_id text,
    thumbnail_url text,
    fullsize_url text,
    rank integer
);


ALTER TABLE images OWNER TO hive;


CREATE TABLE pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


ALTER TABLE pgmigrations OWNER TO hive;


CREATE SEQUENCE pgmigrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE pgmigrations_id_seq OWNER TO hive;


ALTER SEQUENCE pgmigrations_id_seq OWNED BY pgmigrations.id;



CREATE SEQUENCE product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE product_id_seq OWNER TO hive;


CREATE TABLE product_properties (
    id integer NOT NULL,
    shop_id bigint NOT NULL,
    _hive_is_invalid boolean,
    _hive_invalid_reason text
);


ALTER TABLE product_properties OWNER TO hive;


CREATE SEQUENCE product_properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE product_properties_id_seq OWNER TO hive;


ALTER SEQUENCE product_properties_id_seq OWNED BY product_properties.id;



CREATE TABLE products (
    id bigint DEFAULT nextval('product_id_seq'::regclass) NOT NULL,
    shop_id bigint NOT NULL,
    property_name text NOT NULL,
    property_value text,
    modified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE products OWNER TO hive;


CREATE SEQUENCE profile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE profile_id_seq OWNER TO hive;


CREATE SEQUENCE profile_variation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE profile_variation_id_seq OWNER TO hive;


CREATE SEQUENCE profile_variation_option_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE profile_variation_option_id_seq OWNER TO hive;


CREATE TABLE profile_variation_options (
    id bigint DEFAULT nextval('profile_variation_option_id_seq'::regclass) NOT NULL,
    variation_id bigint NOT NULL,
    value_id bigint,
    value text NOT NULL,
    formatted_value text,
    price numeric(9,2) DEFAULT NULL::numeric,
    is_available boolean DEFAULT true NOT NULL,
    sequence integer DEFAULT 0
);


ALTER TABLE profile_variation_options OWNER TO hive;


CREATE TABLE profile_variations (
    id bigint DEFAULT nextval('profile_variation_id_seq'::regclass) NOT NULL,
    profile_id bigint NOT NULL,
    first boolean DEFAULT true NOT NULL,
    property_id bigint NOT NULL,
    formatted_name text,
    scaling_option_id bigint
);


ALTER TABLE profile_variations OWNER TO hive;


CREATE TABLE profiles (
    id bigint DEFAULT nextval('profile_id_seq'::regclass) NOT NULL,
    shop_id bigint NOT NULL,
    name text,
    recipient text,
    taxonomy_id bigint
);


ALTER TABLE profiles OWNER TO hive;


CREATE SEQUENCE shop_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE shop_id_seq OWNER TO hive;


CREATE SEQUENCE shop_sections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE shop_sections_id_seq OWNER TO hive;


CREATE TABLE shop_sections (
    id bigint DEFAULT nextval('shop_sections_id_seq'::regclass) NOT NULL,
    shop_id bigint NOT NULL,
    section_id bigint,
    value text
);


ALTER TABLE shop_sections OWNER TO hive;


CREATE TABLE shops (
    id bigint DEFAULT nextval('shop_id_seq'::regclass) NOT NULL,
    account_id bigint NOT NULL,
    property_name text NOT NULL,
    property_value text
);


ALTER TABLE shops OWNER TO hive;


CREATE SEQUENCE task_queue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE task_queue_id_seq OWNER TO hive;


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


ALTER TABLE task_queue OWNER TO hive;


CREATE TABLE user_profiles (
    user_id bigint NOT NULL,
    property_name text NOT NULL,
    property_value text,
    modified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE user_profiles OWNER TO hive;


CREATE SEQUENCE variation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE variation_id_seq OWNER TO hive;


CREATE SEQUENCE variation_option_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE variation_option_id_seq OWNER TO hive;


CREATE TABLE variation_options (
    id bigint DEFAULT nextval('variation_option_id_seq'::regclass) NOT NULL,
    variation_id bigint NOT NULL,
    value_id bigint,
    value text NOT NULL,
    formatted_value text,
    price numeric(9,2) DEFAULT NULL::numeric,
    is_available boolean DEFAULT true NOT NULL,
    sequence integer DEFAULT 0
);


ALTER TABLE variation_options OWNER TO hive;


CREATE TABLE variation_property_dict (
    id bigint NOT NULL,
    name text
);


ALTER TABLE variation_property_dict OWNER TO hive;


CREATE TABLE variations (
    id bigint DEFAULT nextval('variation_id_seq'::regclass) NOT NULL,
    product_id bigint NOT NULL,
    first boolean DEFAULT true NOT NULL,
    property_id bigint NOT NULL,
    formatted_name text,
    scaling_option_id bigint,
    recipient_id bigint
);


ALTER TABLE variations OWNER TO hive;


ALTER TABLE ONLY pgmigrations ALTER COLUMN id SET DEFAULT nextval('pgmigrations_id_seq'::regclass);



ALTER TABLE ONLY product_properties ALTER COLUMN id SET DEFAULT nextval('product_properties_id_seq'::regclass);





























































































ALTER TABLE ONLY accounts
    ADD CONSTRAINT accounts_unique_rows UNIQUE (id, company_id, channel_id, property_name, property_value);



ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_name_key UNIQUE (name);



ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);



ALTER TABLE ONLY images
    ADD CONSTRAINT image_rank_unique UNIQUE (product_id, rank);



ALTER TABLE ONLY images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);



ALTER TABLE ONLY variations
    ADD CONSTRAINT max_two_props_per_product UNIQUE (product_id, first);



ALTER TABLE ONLY profile_variations
    ADD CONSTRAINT max_two_props_per_variation_profile UNIQUE (profile_id, first);



ALTER TABLE ONLY product_properties
    ADD CONSTRAINT product_properties_pkey PRIMARY KEY (id);



ALTER TABLE ONLY profile_variation_options
    ADD CONSTRAINT profile_variation_options_pkey PRIMARY KEY (id);



ALTER TABLE ONLY profile_variations
    ADD CONSTRAINT profile_variations_pkey PRIMARY KEY (id);



ALTER TABLE ONLY profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);



ALTER TABLE ONLY shops
    ADD CONSTRAINT shops_unique_rows UNIQUE (id, account_id, property_name, property_value);



ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_pkey PRIMARY KEY (id);



ALTER TABLE ONLY user_profiles
    ADD CONSTRAINT user_profiles_unique UNIQUE (user_id, property_name);



ALTER TABLE ONLY variation_options
    ADD CONSTRAINT variation_options_pkey PRIMARY KEY (id);



ALTER TABLE ONLY variation_property_dict
    ADD CONSTRAINT variation_property_dict_pkey PRIMARY KEY (id);



ALTER TABLE ONLY variations
    ADD CONSTRAINT variations_pkey PRIMARY KEY (id);



CREATE INDEX product_properties_shop_id ON product_properties USING btree (shop_id);



CREATE INDEX products_id ON products USING btree (id);



CREATE INDEX products_shop_id ON products USING btree (shop_id);



CREATE INDEX products_shop_id_property_name ON products USING btree (shop_id, property_name);



CREATE INDEX user_profiles_id ON user_profiles USING btree (user_id);



CREATE INDEX variation_options_index ON variation_options USING btree (variation_id);



ALTER TABLE ONLY accounts
    ADD CONSTRAINT accounts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id);



ALTER TABLE ONLY image_data
    ADD CONSTRAINT image_data_image_id_fkey FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE;



ALTER TABLE ONLY profile_variation_options
    ADD CONSTRAINT profile_variation_options_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES profile_variations(id) ON DELETE CASCADE;



ALTER TABLE ONLY profile_variations
    ADD CONSTRAINT profile_variations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;



ALTER TABLE ONLY profile_variations
    ADD CONSTRAINT profile_variations_property_id_fkey FOREIGN KEY (property_id) REFERENCES variation_property_dict(id) ON DELETE RESTRICT;



ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id);



ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES task_queue(id) ON DELETE CASCADE;



ALTER TABLE ONLY variation_options
    ADD CONSTRAINT variation_options_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE;



ALTER TABLE ONLY variations
    ADD CONSTRAINT variations_property_id_fkey FOREIGN KEY (property_id) REFERENCES variation_property_dict(id) ON DELETE RESTRICT;



REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;



