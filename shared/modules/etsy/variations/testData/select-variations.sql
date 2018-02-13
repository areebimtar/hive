select vo.formatted_value, vo.value, vo.value_id, v.property_id, p.property_value as taxonomy_id, p.id as product_id, p2.property_value as recipient
from variation_options vo
inner join variations v
 on v.id = vo.variation_id
inner join products  p
 on v.product_id = p.id
inner join products p2
 on p.id = p2.id
where p.property_name = 'taxonomy_id'
and p2.property_name = 'recipient'
and v.property_id in ('100', '501', '504', '505', '506', '511', '512')
limit 2500;
