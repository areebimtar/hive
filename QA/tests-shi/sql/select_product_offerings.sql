select pp.title, po.price, po.sku, po.quantity, po.visibility,
vo.value_id as variation_option_value_id, vo.value as variation_option_value, sequence as vo_sequence,
v.first, v.property_id, v.formatted_name, v.scaling_option_id, v.influences_price, v.influences_quantity, v.influences_sku
from product_offerings po
left join product_offering_options poo on poo.product_offering_id=po.id
left join variation_options vo on poo.variation_option_id=vo.id
left join variations v on vo.variation_id=v.id
left join product_properties pp on po.product_id=pp.id
--- left join (select id, property_value as title from products where property_name = 'title') as pr on po.product_id=pr.id
order by pp.title, po.id, first DESC;
