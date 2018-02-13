SELECT v.product_id, v.first, v.property_id, v.formatted_name, v.scaling_option_id, o.value_id, o.value, o.sequence
FROM variations v JOIN variation_options o ON v.id = o.variation_id
ORDER BY v.product_id, v.first DESC, o.sequence;
