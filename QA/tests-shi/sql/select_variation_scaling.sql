SELECT v.property_id, v.formatted_name, v.scaling_option_id, p.property_value AS title
  FROM variations v JOIN products p ON p.id = v.product_id
  WHERE p.property_name = 'title'
    AND v.property_id != 200
  ORDER BY title, formatted_name;
