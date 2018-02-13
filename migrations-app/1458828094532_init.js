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

  // Create `channels` table
  pgm.createTable('channels', {
    id: { type: 'bigint', notNull: true, primaryKey: true },
    name: { type: 'text', notNull: true, unique: true }
  });

  // Create `accounts` table
  pgm.sql('CREATE SEQUENCE account_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1');

  // TODO: Refactor table to use `json` instead of weird property_name and property_value
  pgm.createTable('accounts', {
    id: {type: 'bigint', default: new PgLiteral(`nextval('account_id_seq'::regclass)`), notNull: true},
    company_id: { type: 'bigint', notNull: true },
    channel_id: { type: 'bigint', notNull: true, references: 'channels (id)'},
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' }
  });

  pgm.addConstraint('accounts', 'accounts_unique_rows',
    'UNIQUE (id, company_id, channel_id, property_name, property_value)');

  // Create `shops` table
  pgm.sql('CREATE SEQUENCE shop_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1');

  // TODO: Refactor shop table to use `json` instead of weird property_name and property_value
  pgm.createTable('shops', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('shop_id_seq'::regclass)`), notNull: true},
    account_id: { type: 'bigint', notNull: true/*, references: 'accounts (id)'/**/}, // TODO: when accounts will be refactored, turn on this constraint
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' }
  });

  pgm.addConstraint('shops', 'shops_unique_rows',
    'UNIQUE (id, account_id, property_name, property_value)');

  // Create `products` table
  pgm.sql('CREATE SEQUENCE product_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');

  pgm.createTable('products', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('product_id_seq'::regclass)`), notNull: true},
    shop_id: { type: 'bigint', notNull: true/*, references: 'shops (id)' /**/}, // TODO: when shops table will be refactored, turn on this constraint
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' },
    modified_at: { type: 'timestamp with time zone', default: new PgLiteral('now()') }
  });

  // Create `shop_sections` table
  pgm.sql('CREATE SEQUENCE shop_sections_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('shop_sections', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('shop_sections_id_seq'::regclass)`), notNull: true },
    shop_id: { type: 'bigint', notNull: true/*, references: 'shops (id)' /**/ }, // TODO: when shops table will be refactored, turn on this constraint
    section_id: { type: 'bigint', default: null },
    value: { type: 'text' } // TODO: This should be renamed to `title` or `name`
  });

  // Create `images` table
  pgm.sql('CREATE SEQUENCE image_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('images', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('image_id_seq'::regclass)`), notNull: true, primaryKey: true },
    product_id: { type: 'bigint', notNull: true/*, references: 'products (id)' /**/ }, // TODO: when products table will be refactored, turn on this constraint
    channel_image_id: { type: 'text', default: null },
    thumbnail_url: { type: 'text', default: null },
    fullsize_url: { type: 'text', default: null }
  });

  pgm.createTable('image_data', {
    image_id: { type: 'bigint', references: 'images (id) ON DELETE CASCADE', notNull: true },
    image: { type: 'bytea', notNull: true },
    mime: { type: 'text', notNull: true },
    filename: { type: 'text', notNull: true }
  });

  // Create `images` table
  pgm.sql('CREATE SEQUENCE task_queue_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('task_queue', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('task_queue_id_seq'::regclass)`), notNull: true, primaryKey: true },
    company_id: { type: 'bigint', notNull: true },
    channel_id: { type: 'bigint', notNull: true, references: 'channels (id)'},
    operation: { type: 'text', notNull: true },
    operation_data: { type: 'text' },
    created_at: { type: 'timestamp with time zone', default: new PgLiteral('now()') },
    state: { type: 'text' },
    state_expires_at: { type: 'timestamp with time zone' },
    retry: { type: 'int', default: 0 },
    parent_id: { type: 'bigint', default: null, references: 'task_queue (id) ON DELETE CASCADE'},
    suspension_point: { type: 'text', default: null },
    result: { type: 'text', default: null },
    modified: { type: 'boolean', default: false }
  });

  // Create `variations` table
  pgm.sql('CREATE SEQUENCE variation_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('variations', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('variation_id_seq'::regclass)`), notNull: true, primaryKey: true },
    variation_name: { type: 'text', notNull: true },
    variation_value: { type: 'text', notNull: true }
  });

  // Create `variation_combinations` table
  pgm.sql('CREATE SEQUENCE variation_combinations_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('variation_combinations', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('variation_combinations_id_seq'::regclass)`), notNull: true },
    variation_id: { type: 'bigint', notNull: true, references: 'variations (id) ON DELETE CASCADE' }
  });

  // Create `product_variations` table
  pgm.sql('CREATE SEQUENCE product_variation_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');

  pgm.createTable('product_variations', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('product_variation_id_seq'::regclass)`), notNull: true },
    variation_combination_id: { type: 'bigint', notNull: true/*, references: 'variation_combinations (id) ON DELETE CASCADE' /**/ }, // TODO: figure out how to solve this better
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' }
  });

  // TODO: Upsert imitation
  pgm.sql(`CREATE OR REPLACE FUNCTION upsertProductRow(pid bigint, sid bigint, pn text, pv text)
    RETURNS void AS
    $$
    BEGIN
      UPDATE products SET property_value=pv, modified_at=now() WHERE id=pid and shop_id=sid and property_name=pn;
      IF NOT FOUND THEN
        INSERT INTO products (id, shop_id, property_name, property_value) VALUES (pid, sid, pn, pv);
      END IF;
    END;
    $$
    LANGUAGE 'plpgsql' VOLATILE;
  `);

  pgm.sql(`CREATE OR REPLACE FUNCTION insertVariation(vn text, vv text) RETURNS bigint AS $$
    DECLARE
        variation_id bigint;
    BEGIN
      SELECT INTO variation_id id FROM variations WHERE variation_name=vn AND variation_value=vv;
      IF NOT FOUND THEN
        INSERT INTO variations (variation_name, variation_value) VALUES (vn, vv) RETURNING id INTO variation_id;
      END IF;

      RETURN variation_id;
    END;
    $$ LANGUAGE 'plpgsql' VOLATILE;
  `);
  // ^^^

  //////////
  // TODO: This should be moved to users DB
  pgm.createTable('user_profiles', {
    user_id: { type: 'bigint', notNull: true },
    property_name: { type: 'text', notNull: true },
    property_value: { type: 'text' }
  });

  // ^^^^^^^^^^^^
};

exports.down = function(pgm) {
  pgm.dropTable('user_profiles');
  pgm.sql('DROP FUNCTION insertVariation(vn text, vv text)');
  pgm.sql('DROP FUNCTION upsertProductRow(pid bigint, sid bigint, pn text, pv text)');
  pgm.dropTable('product_variations');
  pgm.sql('DROP SEQUENCE product_variation_id_seq');
  pgm.dropTable('variation_combinations');
  pgm.sql('DROP SEQUENCE variation_combinations_id_seq');
  pgm.dropTable('variations');
  pgm.sql('DROP SEQUENCE variation_id_seq');
  pgm.dropTable('task_queue');
  pgm.sql('DROP SEQUENCE task_queue_id_seq');
  pgm.dropTable('image_data');
  pgm.dropTable('images');
  pgm.sql('DROP SEQUENCE image_id_seq');
  pgm.dropTable('shop_sections');
  pgm.sql('DROP SEQUENCE shop_sections_id_seq');
  pgm.dropTable('products');
  pgm.sql('DROP SEQUENCE product_id_seq');
  pgm.dropTable('shops');
  pgm.sql('DROP SEQUENCE shop_id_seq');
  pgm.dropTable('accounts');
  pgm.sql('DROP SEQUENCE account_id_seq');
  pgm.dropTable('channels');
};
