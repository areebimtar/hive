exports.up = function(pgm) {
  pgm.sql(`CREATE OR REPLACE FUNCTION deleteShop(shopid bigint)
    RETURNS void AS
    $$
    DECLARE
      accountid bigint;
      shops_count bigint;
    BEGIN
      DELETE FROM images WHERE product_id IN (SELECT id FROM products WHERE shop_id = shopid);
      DELETE FROM products WHERE shop_id = shopid;
      DELETE FROM shop_sections WHERE shop_id = shopid;
      SELECT DISTINCT account_id FROM shops where id = shopid INTO accountid;
      SELECT count(*) FROM (SELECT DISTINCT id, account_id FROM shops WHERE account_id=accountid) as t1 INTO shops_count;
      IF shops_count = 1 THEN
        DELETE FROM accounts WHERE id = accountid;
      END IF;

      DELETE FROM shops WHERE id = shopid;
    END;
    $$
    LANGUAGE 'plpgsql' VOLATILE;
  `);
};

exports.down = function(pgm) {
  pgm.sql('DROP FUNCTION deleteShop(shopid bigint)');
};
