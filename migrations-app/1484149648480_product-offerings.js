const PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function up(pgm) {
  // add columns to variations
  pgm.addColumns('variations', {
    influences_price: {type: 'boolean', default: false, notNull: true},
    influences_quantity: {type: 'boolean', default: false, notNull: true},
    influences_sku: {type: 'boolean', default: false, notNull: true}
  });

  // create product_offerings without fkey constraints, add them at the end once populated
  pgm.sql('CREATE SEQUENCE product_offering_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('product_offerings', {
    id: {
      type: 'bigint',
      notNull: true,
      primaryKey: true,
      default: new PgLiteral(`nextval('product_offering_id_seq'::regclass)`)
    },
    product_id: {
      type: 'bigint',
      notNull: true
    },
    price: 'numeric(9,2)',
    sku: 'text',
    quantity: 'int'
  });

  // create product_offering_options without fkey constraints, add at the end when done populating
  pgm.sql('CREATE SEQUENCE product_offering_option_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;');
  pgm.createTable('product_offering_options', {
    id: {
      type: 'bigint',
      notNull: true,
      primaryKey: true,
      default: new PgLiteral(`nextval('product_offering_option_id_seq'::regclass)`)
    },
    product_offering_id: {
      type: 'bigint',
      notNull: true
    },
    variation_option_id: {
      type: 'bigint',
      notNull: true
    }
  });

  // update variations with influences_price, influences_quantity, influences_sku from variation_options
  // eslint-disable-next-line no-multi-str
  pgm.sql(`
    update variations AS v
    set influences_price =
      (select exists
        (select price
         from variation_options as vo
         where v.id = vo.variation_id and price is not null)),
    influences_quantity = false,
    influences_sku = false`);

  // fill product_offerings and product_offering_options from products and variation_options
  // add temporary columns to product_offerings
  pgm.addColumns('product_offerings', {
    variation_option_id: 'bigint',
    variation_option_id_1: 'bigint'});

  // product_offerings from variations when first variation option has price, and there are two variations
  pgm.sql(`
    insert into product_offerings
    (product_id, price, quantity, sku, variation_option_id, variation_option_id_1)
    select v.product_id as product_id, vo.price as price, NULL as quantity, NULL as sku, vo.id as variation_option_id, vo1.id as variation_option_id_1
    from variations as v, variations as v1, variation_options as vo, variation_options as vo1
    where v.id = vo.variation_id
    and v1.id = vo1.variation_id
    and v.product_id = v1.product_id
    and vo.price is not null
    and vo1.id <> vo.id
    and vo1.variation_id <> vo.variation_id`);

  // product_offerings from variations when both variation options have no prices, two variations
  pgm.sql(`
    insert into product_offerings
    (product_id, price, quantity, sku, variation_option_id, variation_option_id_1)
    select v.product_id as product_id, NULL as price, NULL as quantity, NULL as sku, vo.id as variation_option_id, vo1.id as variation_option_id_1
    from variations as v, variations as v1, variation_options as vo, variation_options as vo1
    where v.id = vo.variation_id
    and v1.id = vo1.variation_id
    and v.product_id = v1.product_id
    and vo.price is null
    and vo1.price is null
    and vo1.id < vo.id
    and vo1.variation_id <> vo.variation_id`);

  // product_offerings from variations when there is just one variation
  pgm.sql(`
    insert into product_offerings
    (product_id, price, quantity, sku, variation_option_id, variation_option_id_1)
    select v.product_id as product_id, vo.price as price, NULL as quantity, NULL as sku, vo.id as variation_option_id, NULL as variation_option_id_1
    from variations as v, variation_options as vo
    where v.id = vo.variation_id
    and not exists (select v1.id from variations as v1 where v.product_id = v1.product_id and v1.id <> v.id)`);

  // move variation_option_id into product_offering_options
  pgm.sql(`
    insert into product_offering_options
    (product_offering_id, variation_option_id)
    select id, variation_option_id
    from product_offerings
    where variation_option_id IS NOT NULL`);

  // insert products with no variations
  pgm.sql(`
    insert into product_offerings
    (product_id)
    select id
    from product_properties as pp
    where not exists (select product_id from variations as v where pp.id = v.product_id)`);

  // move variation_option_id1 into product_offering_options
  pgm.sql(`
    insert into product_offering_options
    (product_offering_id, variation_option_id)
    select id, variation_option_id_1
    from product_offerings
    where variation_option_id_1 IS NOT NULL`);

  // drop temporary columns from product_offerings
  pgm.dropColumns('product_offerings', [
    'variation_option_id',
    'variation_option_id_1' ]);


  // fill in price and quantity in product_offerings when missing
  pgm.sql(`
    CREATE OR REPLACE FUNCTION conditional_update()
    RETURNS void AS
    $$
    DECLARE
      prod_count int;
    BEGIN
      SELECT count(id) FROM product_properties INTO prod_count;
      IF prod_count < 50000 THEN
        update product_offerings as po
        set price = (
          select to_number(p.property_value, '9999999.99')
          from products as p
          where p.id = po.product_id and property_name = 'price'
          limit 1)
        where po.price is null;
        update product_offerings as po
        set quantity = (
          select to_number(p.property_value, '999999999')
          from products as p
          where p.id = po.product_id and property_name = 'quantity'
          limit 1)
        where po.quantity is null;
      END IF;
    END;
    $$
    LANGUAGE 'plpgsql' VOLATILE;
  `);
  pgm.sql(`
    select conditional_update();
    drop function conditional_update()
  `);

  // add fkey constraint to product_offerings table
  pgm.sql(`
    ALTER TABLE product_offerings
    ADD CONSTRAINT product_offerings_product_properties_fkey
    FOREIGN KEY (product_id) REFERENCES product_properties (id)
    ON DELETE CASCADE`);

  // add fkey constraints to product_offering_options table
  pgm.sql(`
    ALTER TABLE product_offering_options
    ADD CONSTRAINT product_offering_options_product_offering_fkey
    FOREIGN KEY (product_offering_id) REFERENCES product_offerings (id)
    ON DELETE CASCADE`);
  pgm.sql(`
    ALTER TABLE product_offering_options
    ADD CONSTRAINT product_offering_options_variation_options_fkey
    FOREIGN KEY (variation_option_id) REFERENCES variation_options (id)
    ON DELETE CASCADE`);
};

exports.down = function down(pgm) {
  pgm.dropTable('product_offering_options');
  pgm.sql('DROP SEQUENCE product_offering_option_id_seq');

  pgm.dropTable('product_offerings');
  pgm.sql('DROP SEQUENCE product_offering_id_seq');

  pgm.dropColumns('variations', [
    'influences_price',
    'influences_quantity',
    'influences_sku'
  ]);
};
