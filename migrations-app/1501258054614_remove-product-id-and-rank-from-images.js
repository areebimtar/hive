exports.up = function(pgm) {
  pgm.dropColumns('images', ['product_id', 'rank']);

  pgm.sql('DROP FUNCTION public.deleteshop(shopid bigint)');
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

exports.down = function(pgm) {
  pgm.addColumns('images', {
    product_id: { type: 'bigint' },
    rank: { type: 'integer' }
  });

  pgm.sql('DROP FUNCTION public.deleteshop(shopid bigint)');
  pgm.sql(`CREATE OR REPLACE FUNCTION deleteshop(param_shop_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      var_account_id bigint;
      var_shops_count bigint;
    BEGIN
      DELETE FROM images WHERE product_id IN (SELECT id FROM products WHERE shop_id = param_shop_id);
      SELECT DISTINCT account_id FROM shops where id = param_shop_id INTO var_account_id;
      SELECT count(*) FROM (SELECT DISTINCT id, account_id FROM shops WHERE account_id=var_account_id) as t1 INTO var_shops_count;
      IF var_shops_count = 1 THEN
        DELETE FROM accounts WHERE id = var_account_id;
      END IF;
      DELETE FROM shops WHERE id = param_shop_id;
    END;
    $function$`);
};
