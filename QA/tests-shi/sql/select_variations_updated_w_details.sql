SELECT v.product_id, v.property_id, v.scaling_option_id, v.first, vo.value, vo.price, vo.is_available, vo.sequence
FROM variations v JOIN variation_options vo ON v.id = vo.variation_id
WHERE v.product_id in (1,4)  ORDER BY v.product_id, v.property_id, vo.sequence
