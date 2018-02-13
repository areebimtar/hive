ALTER TABLE product_offerings ADD COLUMN price_populated_at timestamp;
ALTER TABLE product_offerings ADD COLUMN quantity_populated_at timestamp;
ALTER TABLE shops ADD COLUMN offerings_populated BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION mergedPriceDataForShop(shop_to_populate bigint)
RETURNS TABLE (
    product_id bigint,
    offering_id bigint,
    product_price text,
    offering_price numeric(9,2)
    ) AS
$$
BEGIN
 RETURN QUERY
    WITH product_ids AS (
        select product_properties.id from product_properties where product_properties.shop_id = shop_to_populate
    ), products_price_data AS (
        select products.id as pid, products.property_value as pricetext
        from products
        where products.id in (select product_ids.id from product_ids)
        and property_name = 'price'
    ),
    offering_price_data AS (
      select product_offerings.id as oid, product_offerings.product_id as pid, product_offerings.price as price
      from product_offerings where product_offerings.product_id in (select product_ids.id from product_ids)
    )

     SELECT opd.pid, opd.oid, ppd.pricetext, opd.price
     FROM products_price_data ppd
     JOIN offering_price_data opd
     ON ppd.pid = opd.pid;
END
$$
LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION mergedQuantityDataForShop(shop_to_populate bigint)
RETURNS TABLE (
    product_id bigint,
    offering_id bigint,
    product_quantity text,
    offering_quantity integer
    ) AS
$$
BEGIN
 RETURN QUERY
    WITH product_ids AS (
        select product_properties.id from product_properties where product_properties.shop_id = shop_to_populate
    ), products_quantity_data AS (
        select products.id as pid, products.property_value as quantitytext
        from products
        where products.id in (select product_ids.id from product_ids)
        and property_name = 'quantity'
    ),
    offering_quantity_data AS (
      select product_offerings.id as oid, product_offerings.product_id as pid, product_offerings.quantity as quantity
      from product_offerings where product_offerings.product_id in (select product_ids.id from product_ids)
    )

     SELECT oqd.pid, oqd.oid, pqd.quantitytext, oqd.quantity
     FROM products_quantity_data pqd
     JOIN offering_quantity_data oqd
     ON pqd.pid = oqd.pid;
END
$$
LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION updateOneShop(shop_to_populate bigint)
RETURNS void
AS
$$
BEGIN
    WITH price_data AS (
        SELECT product_id as pid, offering_id as oid, COALESCE(offering_price, to_number(product_price, '9999999.99')) as price
        FROM mergedPriceDataForShop(shop_to_populate)
    )
    UPDATE product_offerings po
    SET price = pd.price,
    price_populated_at = now()
    FROM price_data pd
    WHERE po.id = pd.oid;

    WITH quantity_data AS (
        SELECT product_id as pid, offering_id as oid, COALESCE(offering_quantity, to_number(product_quantity,  '999999999')) as quantity
        FROM mergedQuantityDataForShop(shop_to_populate)
    )
    UPDATE product_offerings po
    SET quantity = qd.quantity,
    quantity_populated_at = now()
    FROM quantity_data qd
    WHERE po.id = qd.oid;
END
$$
LANGUAGE 'plpgsql' VOLATILE;


CREATE OR REPLACE FUNCTION updateNextShop()
RETURNS bigint
AS
$$
    DECLARE shop_to_update bigint;
BEGIN
    SELECT id FROM shops WHERE offerings_populated = FALSE INTO shop_to_update;

    IF (shop_to_update IS NULL) THEN
        RETURN -1;
    ELSE
        PERFORM updateOneShop(shop_to_update);
        UPDATE shops SET offerings_populated = TRUE WHERE id = shop_to_update;
        RETURN shop_to_update;
    END IF;
END
$$
LANGUAGE 'plpgsql' VOLATILE;