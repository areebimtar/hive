-- select variations definitions
select product_id, first, property_id, formatted_name, scaling_option_id, influences_price, influences_quantity, influences_sku from variations order by product_id, first desc;
