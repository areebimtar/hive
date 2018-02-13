
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;


CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;



COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;


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
    fullsize_url text
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



CREATE TABLE products (
    id bigint DEFAULT nextval('product_id_seq'::regclass) NOT NULL,
    shop_id bigint NOT NULL,
    property_name text NOT NULL,
    property_value text,
    modified_at timestamp with time zone DEFAULT now()
);


ALTER TABLE products OWNER TO hive;


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
    property_value text
);


ALTER TABLE user_profiles OWNER TO hive;



ALTER TABLE ONLY pgmigrations ALTER COLUMN id SET DEFAULT nextval('pgmigrations_id_seq'::regclass);








































































ALTER TABLE ONLY accounts
    ADD CONSTRAINT accounts_unique_rows UNIQUE (id, company_id, channel_id, property_name, property_value);



ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_name_key UNIQUE (name);



ALTER TABLE ONLY channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);



ALTER TABLE ONLY images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);



ALTER TABLE ONLY shops
    ADD CONSTRAINT shops_unique_rows UNIQUE (id, account_id, property_name, property_value);



ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_pkey PRIMARY KEY (id);



CREATE INDEX products_id ON products USING btree (id);



CREATE INDEX products_shop_id ON products USING btree (shop_id);



CREATE INDEX products_shop_id_property_name ON products USING btree (shop_id, property_name);



ALTER TABLE ONLY accounts
    ADD CONSTRAINT accounts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id);



ALTER TABLE ONLY image_data
    ADD CONSTRAINT image_data_image_id_fkey FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE;



ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id);



ALTER TABLE ONLY task_queue
    ADD CONSTRAINT task_queue_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES task_queue(id) ON DELETE CASCADE;


REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;



