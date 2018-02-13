var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {

  pgm.sql(`CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
    SET statement_timeout = 0;
    SET lock_timeout = 0;
    SET client_encoding = 'UTF8';
    SET standard_conforming_strings = on;
    SET check_function_bodies = false;
    SET client_min_messages = warning;
    SET search_path = public, pg_catalog;
    SET default_tablespace = '';
    SET default_with_oids = false;
  `);

  // Create companies table
  pgm.sql('CREATE SEQUENCE company_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('companies', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('company_id_seq'::regclass)`), notNull: true, unique: true, primaryKey: true },
  });

  // TODO: Temporary stuff, remove
  pgm.sql('INSERT INTO companies (id) VALUES (1), (2), (3), (4), (5)');
  // ^^^

  // Create users table
  pgm.sql('CREATE SEQUENCE user_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('users', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('user_id_seq'::regclass)`), notNull: true, unique: true, primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    hash: { type: 'text', notNull: true },
    company_id: { type: 'bigint', references: 'companies (id) ON DELETE RESTRICT'},
    db: { type: 'text', notNull: true }
  });

  // TODO: Temporary stuff, remove
  pgm.sql(`INSERT INTO users (id, name, hash, company_id, db) VALUES
    (1, 'user1', '$2a$10$1j1kJPFS7UmrAf/LR97i2OnlOD6IJPvB6RC2cH9/r23ef4K2KKqve', 1, 'db1'),
    (2, 'user2', '$2a$10$DEUiOb6ZsBWlSpmsAq9W8eF3lY4hMSaboYOVMPn4nJ7ME2KAo1Bqa', 2, 'db1'),
    (3, 'user3', '$2a$10$NxLTdCmcoTiwanDgRcmPM.hP23ntOmoXJWLzrN7VbOFF9hsviJFOa', 3, 'db1'),
    (4, 'jkillian@myhiveonline.com', '$2a$10$YUPtvRLYLRJ7Skjl2u1pHuV7xlWer.eX1CK0bLbdQ7B2HF/GA0o6S', 4, 'db1'),
    (5, 'jwkillian12@gmail.com', '$2a$10$c4BQe1JbvntLWm5JFLCXOOXxdMe4tZBgJbKx23xk2KzGlXay0PcWy', 5, 'db1')
  `);
  // ^^^

  // Create request_info table
  pgm.sql('CREATE SEQUENCE request_info_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('request_info', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('request_info_id_seq'::regclass)`), notNull: true, unique: true, primaryKey: true },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true }
  });
};

exports.down = function(pgm) {
  pgn.dropTable('request_info');
  pgm.sql('DROP SEQUENCE request_info_id_seq');
  pgm.dropTable('companies');
  pgm.sql('DROP SEQUENCE company_id_seq');
  pgm.dropTable('users');
  pgm.sql('DROP SEQUENCE user_id_seq');
};
