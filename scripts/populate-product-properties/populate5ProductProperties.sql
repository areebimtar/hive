with updateSelect as (
  select id
  from product_properties
  where channel_modification_timestamp is null
  limit 5
  for update
  )
update product_properties pp
set channel_listing_id = COALESCE(
  (select property_value::text
  from products
  where id = pp.id
  and shop_id = pp.shop_id
  and property_name = 'listing_id'
  limit 1),
  null),
state = COALESCE(
  (select property_value
  from products
  where id = pp.id
  and shop_id = pp.shop_id
  and property_name = 'state'
  limit 1),
  null),
modified_by_hive = COALESCE(
  (select case when property_value = 't' then true else false end
  from products
  where id = pp.id
  and shop_id = pp.shop_id
  and property_name = '_modifiedByHive'
  limit 1),
  null),
channel_modification_timestamp = COALESCE(
  (select to_timestamp(to_number(property_value,'99999999999'))
  from products
  where id = pp.id
  and shop_id = pp.shop_id
  and property_name = 'last_modified_tsz'
  limit 1),
  '2021-03-30 16:39:44.694717+02')
from updateSelect
where pp.id = updateSelect.id
