var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  // Remove old variations tables as they were not used
  pgm.sql('DROP FUNCTION insertVariation(vn text, vv text)');
  pgm.dropTable('product_variations');
  pgm.sql('DROP SEQUENCE product_variation_id_seq');
  pgm.dropTable('variation_combinations');
  pgm.sql('DROP SEQUENCE variation_combinations_id_seq');
  pgm.dropTable('variations');
  pgm.sql('DROP SEQUENCE variation_id_seq');

  pgm.createTable('variation_property_dict', {
    id: { type: 'bigint', notNull: true, primaryKey: true }, // ID defined by Etsy
    name: { type: 'text' }
  });

  // Properties were taken from
  // https://www.etsy.com/developers/documentation/getting_started/variations#section_property_reference
  pgm.sql(`INSERT INTO variation_property_dict (id, name) VALUES
    (100, 'Size'),
    (200, 'Color'),
    (500, 'Finish'),
    (501, 'Dimensions'),
    (502, 'Fabric'),
    (503, 'Flavor'),
    (504, 'Diameter'),
    (505, 'Height'),
    (506, 'Length'),
    (507, 'Material'),
    (508, 'Pattern'),
    (509, 'Scent'),
    (510, 'Style'),
    (511, 'Weight'),
    (512, 'Width'),
    (513, 'Custom 1'),
    (514, 'Custom 2'),
    (515, 'Device');
  `);


  // varitions entries for individual products
  pgm.sql('CREATE SEQUENCE variation_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('variations', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('variation_id_seq'::regclass)`) },
    product_id: { type: 'bigint', notNull: true/*, references: 'products (id)' /**/ }, // TODO: when products table will be refactored, turn on this constraint
    first: { type: 'boolean', default: true, notNull: true },
    property_id: { type: 'bigint', notNull: true, references: 'variation_property_dict (id) ON DELETE RESTRICT' },
    formatted_name: { type: 'text', default: null }
  });
  pgm.addConstraint('variations', 'max_two_props_per_product', 'UNIQUE (product_id, first)');

  pgm.sql('CREATE SEQUENCE variation_option_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('variation_options', {
    id: { type: 'bigint', notNull: true, primaryKey: true, default: new PgLiteral(`nextval('variation_option_id_seq'::regclass)`) },
    variation_id: { type: 'bigint', notNull: true, references: 'variations (id) ON DELETE CASCADE' },
    value_id: { type: 'bigint', notNull: true},
    value: { type: 'text', notNull: true},
    formatted_value: { type: 'text', notNull: true },
    price: { type: 'numeric(9,2)', default: null },
    is_available: { type: 'boolean', notNull: true, default: true }
  });
};

exports.down = function(pgm) {
  // First drop what we created
  pgm.dropTable('variation_options');
  pgm.sql('DROP SEQUENCE variation_option_id_seq');
  pgm.dropTable('variations');
  pgm.sql('DROP SEQUENCE variation_id_seq');
  pgm.dropTable('variation_property_dict');


  // Next restore what we dropped

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
};
