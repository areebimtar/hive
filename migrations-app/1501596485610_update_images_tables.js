var PgLiteral = require('node-pg-migrate/lib/utils').PgLiteral;

exports.up = function(pgm) {
  pgm.sql('CREATE SEQUENCE vela_images_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1');
  pgm.createTable('vela_images', {
    id: { type: 'bigint', default: new PgLiteral(`nextval('vela_images_id_seq'::regclass)`), notNull: true },
    hash: { type: 'string', notNull: true },
    mime: { type: 'string' }
  });
  pgm.renameColumn('images', 'channel_image_id', 'etsy_image_id');
  pgm.addColumns('images', {
    vela_image_id: { type: 'bigint', notNull: false },
    shop_id: { type: 'bigint', notNull: false, references: 'shops (id)'}
  });
  pgm.dropTable('image_data');

  pgm.sql(`CREATE OR REPLACE FUNCTION deleteshop(param_shop_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      var_account_id bigint;
      var_shops_count bigint;
    BEGIN
      DELETE FROM images WHERE shop_id = param_shop_id;
      SELECT DISTINCT account_id FROM shops where id = param_shop_id INTO var_account_id;
      SELECT count(*) FROM (SELECT DISTINCT id, account_id FROM shops WHERE account_id=var_account_id) as t1 INTO var_shops_count;
      IF var_shops_count = 1 THEN
        DELETE FROM accounts WHERE id = var_account_id;
      END IF;
      DELETE FROM shops WHERE id = param_shop_id;
    END;
    $function$`);
};

exports.down = function(pgm) {
  pgm.createTable('image_data', {
    image_id: { type: 'bigint', notNull: true, references: 'images (id)' },
    image: { type: 'bytea', notNull: true },
    mime: { type: 'text', notNull: true },
    filename: { type: 'text', notNull: true }
  });
  pgm.dropColumns('images', ['vela_image_id', 'shop_id']);
  pgm.renameColumn('images', 'etsy_image_id', 'channel_image_id');
  pgm.dropTable('vela_images');
  pgm.sql('DROP SEQUENCE vela_images_id_seq');

  pgm.sql(`CREATE OR REPLACE FUNCTION deleteshop(param_shop_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      var_account_id bigint;
      var_shops_count bigint;
    BEGIN
      DELETE FROM images WHERE id IN (SELECT DISTINCT(UNNEST(photos)) FROM product_properties WHERE shop_id = param_shop_id);
      SELECT DISTINCT account_id FROM shops where id = param_shop_id INTO var_account_id;
      SELECT count(*) FROM (SELECT DISTINCT id, account_id FROM shops WHERE account_id=var_account_id) as t1 INTO var_shops_count;
      IF var_shops_count = 1 THEN
        DELETE FROM accounts WHERE id = var_account_id;
      END IF;
      DELETE FROM shops WHERE id = param_shop_id;
    END;
    $function$`);
};
