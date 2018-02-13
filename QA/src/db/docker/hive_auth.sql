
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;


CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;



COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;


CREATE SEQUENCE company_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE company_id_seq OWNER TO hive;

SET default_tablespace = '';

SET default_with_oids = false;


CREATE TABLE companies (
    id bigint DEFAULT nextval('company_id_seq'::regclass) NOT NULL
);


ALTER TABLE companies OWNER TO hive;


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



CREATE SEQUENCE request_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE request_info_id_seq OWNER TO hive;


CREATE TABLE request_info (
    id bigint DEFAULT nextval('request_info_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    email text NOT NULL
);


ALTER TABLE request_info OWNER TO hive;


CREATE SEQUENCE reset_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE reset_requests_id_seq OWNER TO hive;


CREATE TABLE reset_requests (
    id bigint DEFAULT nextval('reset_requests_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    link_data text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE reset_requests OWNER TO hive;


CREATE SEQUENCE user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE user_id_seq OWNER TO hive;


CREATE TABLE users (
    id bigint DEFAULT nextval('user_id_seq'::regclass) NOT NULL,
    email text NOT NULL,
    hash text NOT NULL,
    company_id bigint,
    db text NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE users OWNER TO hive;


ALTER TABLE ONLY pgmigrations ALTER COLUMN id SET DEFAULT nextval('pgmigrations_id_seq'::regclass);

































ALTER TABLE ONLY companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);



ALTER TABLE ONLY request_info
    ADD CONSTRAINT request_info_pkey PRIMARY KEY (id);



ALTER TABLE ONLY reset_requests
    ADD CONSTRAINT reset_requests_pkey PRIMARY KEY (id);



ALTER TABLE ONLY users
    ADD CONSTRAINT users_name_key UNIQUE (email);



ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);



ALTER TABLE ONLY reset_requests
    ADD CONSTRAINT reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;



ALTER TABLE ONLY users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;



REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;



