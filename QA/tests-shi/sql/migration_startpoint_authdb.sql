-- Startpoint file for migration of auth files, generated using script migrate-hivedb-data, migrations hash: cda81e2f3781374c1d2e4a4a72d1642e
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
    BEGIN
    
    DELETE FROM users WHERE company_id = companyId;
    DELETE FROM companies WHERE id = companyId;
    
    END;
    $$;


ALTER FUNCTION public.deletecompany(companyid bigint) OWNER TO hive_qa;

--
-- Name: company_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE company_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE company_id_seq OWNER TO hive_qa;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE companies (
    id bigint DEFAULT nextval('company_id_seq'::regclass) NOT NULL
);


ALTER TABLE companies OWNER TO hive_qa;

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
-- Name: request_info_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE request_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE request_info_id_seq OWNER TO hive_qa;

--
-- Name: request_info; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE request_info (
    id bigint DEFAULT nextval('request_info_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    email text NOT NULL
);


ALTER TABLE request_info OWNER TO hive_qa;

--
-- Name: reset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE reset_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE reset_requests_id_seq OWNER TO hive_qa;

--
-- Name: reset_requests; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE reset_requests (
    id bigint DEFAULT nextval('reset_requests_id_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    link_data text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE reset_requests OWNER TO hive_qa;

--
-- Name: session; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE session OWNER TO hive_qa;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: hive_qa
--

CREATE SEQUENCE user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE user_id_seq OWNER TO hive_qa;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hive_qa
--

CREATE TABLE users (
    id bigint DEFAULT nextval('user_id_seq'::regclass) NOT NULL,
    email text NOT NULL,
    hash text NOT NULL,
    company_id bigint,
    db text NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone DEFAULT now(),
    first_login timestamp with time zone,
    last_login timestamp with time zone,
    login_count integer DEFAULT 0,
    admin boolean DEFAULT false NOT NULL,
    type text DEFAULT 'stable'::text NOT NULL
);


ALTER TABLE users OWNER TO hive_qa;

--
-- Name: id; Type: DEFAULT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY pgmigrations ALTER COLUMN id SET DEFAULT nextval('pgmigrations_id_seq'::regclass);


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY companies (id) FROM stdin;
1
2
3
4
5
\.


--
-- Name: company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('company_id_seq', 5, true);


--
-- Data for Name: pgmigrations; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY pgmigrations (id, name, run_on) FROM stdin;
1	1459342788120_init	2017-11-28 11:23:33.237507
2	1461249130142_add_reset_requests	2017-11-28 11:23:33.315716
3	1465307663668_create_user	2017-11-28 11:23:33.364863
4	1465982616130_first-last-login	2017-11-28 11:23:33.428723
5	1468235770802_login_count	2017-11-28 11:23:33.442207
6	1480932145857_delete_company	2017-11-28 11:23:33.519136
7	1495452904239_add_admin	2017-11-28 11:23:33.535804
8	1509018223283_session_table	2017-11-28 11:23:33.606842
9	1511544012175_user_type	2017-11-28 11:23:33.634788
\.


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('pgmigrations_id_seq', 9, true);


--
-- Data for Name: request_info; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY request_info (id, name, email) FROM stdin;
\.


--
-- Name: request_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('request_info_id_seq', 1, false);


--
-- Data for Name: reset_requests; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY reset_requests (id, user_id, link_data, created_at) FROM stdin;
\.


--
-- Name: reset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('reset_requests_id_seq', 1, false);


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY session (sid, sess, expire) FROM stdin;
\.


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('user_id_seq', 5, true);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY users (id, email, hash, company_id, db, first_name, last_name, created_at, first_login, last_login, login_count, admin, type) FROM stdin;
1	user1	$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve	1	db1	\N	\N	2017-11-28 11:23:33.364863+01	\N	\N	0	f	stable
2	user2	$2a$10$DEUiOb6ZsBWlSpmsAq9W8eF3lY4hMSaboYOVMPn4nJ7ME2KAo1Bqa	2	db1	\N	\N	2017-11-28 11:23:33.364863+01	\N	\N	0	f	stable
3	user3	$2a$10$NxLTdCmcoTiwanDgRcmPM.hP23ntOmoXJWLzrN7VbOFF9hsviJFOa	3	db1	\N	\N	2017-11-28 11:23:33.364863+01	\N	\N	0	f	stable
4	jkillian@myhiveonline.com	$2a$10$YUPtvRLYLRJ7Skjl2u1pHuV7xlWer.eX1CK0bLbdQ7B2HF/GA0o6S	4	db1	\N	\N	2017-11-28 11:23:33.364863+01	\N	\N	0	f	stable
5	jwkillian12@gmail.com	$2a$10$c4BQe1JbvntLWm5JFLCXOOXxdMe4tZBgJbKx23xk2KzGlXay0PcWy	5	db1	\N	\N	2017-11-28 11:23:33.364863+01	\N	\N	0	f	stable
\.


--
-- Name: companies_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: request_info_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY request_info
    ADD CONSTRAINT request_info_pkey PRIMARY KEY (id);


--
-- Name: reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY reset_requests
    ADD CONSTRAINT reset_requests_pkey PRIMARY KEY (id);


--
-- Name: session_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: users_name_key; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_name_key UNIQUE (email);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: reset_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY reset_requests
    ADD CONSTRAINT reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hive_qa
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

