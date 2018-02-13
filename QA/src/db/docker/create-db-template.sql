--
-- Hive listing database
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET statement_timeout = 0;
SET check_function_bodies = true;
SET client_min_messages = warning;

-- plpgsql EXTENSION
CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


-- Cleanup
DROP DATABASE IF EXISTS <%DB_NAME%>;

-- Create hive role unless it already exists in the db cluster
DO
$body$
DECLARE
  num_users integer;
BEGIN
	SELECT COUNT(*) INTO num_users FROM pg_user WHERE usename = 'hive';
	IF num_users = 0 THEN
		CREATE ROLE hive WITH LOGIN ENCRYPTED PASSWORD 'hive_password';
	END IF;
	SELECT COUNT(*) INTO num_users FROM pg_user WHERE usename = 'replicator';
	IF num_users = 0 THEN
		CREATE ROLE replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'replicator_password';
	END IF;
END
$body$
;


---------------- Database creation ---------------------------------

CREATE DATABASE <%DB_NAME%> WITH TEMPLATE = template0 OWNER = hive;
REVOKE ALL ON DATABASE <%DB_NAME%> FROM PUBLIC;

GRANT CREATE, CONNECT, TEMPORARY ON DATABASE <%DB_NAME%> TO hive;
GRANT CONNECT,TEMPORARY ON DATABASE <%DB_NAME%> TO hive;




---------------- Table creation ---------------------------------

\connect <%DB_NAME%>

SET default_tablespace = '';
SET default_with_oids = false;

-- !!!
ALTER USER postgres WITH ENCRYPTED PASSWORD 'postgres';
ALTER USER hive WITH ENCRYPTED PASSWORD 'H1ve2015';

