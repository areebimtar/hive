-- Test data auth file, migrated using script migrate-hivedb-data, migrations hash: cda81e2f3781374c1d2e4a4a72d1642e
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
TRUNCATE companies CASCADE;
TRUNCATE pgmigrations CASCADE;
TRUNCATE request_info CASCADE;
TRUNCATE reset_requests CASCADE;
TRUNCATE session CASCADE;
TRUNCATE users CASCADE;


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY companies (id) FROM stdin;
1
2
3
4
5
6
666
\.


--
-- Name: company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hive_qa
--

SELECT pg_catalog.setval('company_id_seq', 666, true);


--
-- Data for Name: pgmigrations; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY pgmigrations (id, name, run_on) FROM stdin;
1	1459342788120_init	2017-10-31 16:33:34.904825
2	1461249130142_add_reset_requests	2017-10-31 16:33:35.004759
3	1465307663668_create_user	2017-10-31 16:33:35.068593
4	1465982616130_first-last-login	2017-10-31 16:33:35.167172
5	1468235770802_login_count	2017-10-31 16:33:35.183413
6	1480932145857_delete_company	2017-10-31 16:33:35.266258
7	1495452904239_add_admin	2017-10-31 16:33:35.294989
8	1509018223283_session_table	2017-11-01 14:19:30.614796
9	1511544012175_user_type	2017-11-28 11:23:01.132548
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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hive_qa
--

COPY users (id, email, hash, company_id, db, first_name, last_name, created_at, first_login, last_login, login_count, admin, type) FROM stdin;
1	user1	$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve	1	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	f	stable
2	user2	$2a$10$DEUiOb6ZsBWlSpmsAq9W8eF3lY4hMSaboYOVMPn4nJ7ME2KAo1Bqa	2	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	f	stable
3	user3	$2a$10$NxLTdCmcoTiwanDgRcmPM.hP23ntOmoXJWLzrN7VbOFF9hsviJFOa	3	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	t	stable
4	jkillian@myhiveonline.com	$2a$10$YUPtvRLYLRJ7Skjl2u1pHuV7xlWer.eX1CK0bLbdQ7B2HF/GA0o6S	4	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	f	stable
5	jwkillian12@gmail.com	$2a$10$c4BQe1JbvntLWm5JFLCXOOXxdMe4tZBgJbKx23xk2KzGlXay0PcWy	5	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	f	stable
6	getvela.test@gmail.com	$2a$10$MphYdhrPDODie9al/sem4uYTjZtoyTYSU5fq26DysJjtksQVKM2UW	6	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	f	stable
42	tester@salsitasoft.com	$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve	666	db1	\N	\N	2016-06-10 15:04:35.623576+02	\N	\N	0	f	stable
\.


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

SELECT pg_catalog.setval('user_id_seq', 42, true);


--
-- PostgreSQL database dump complete
--

COMMIT;
