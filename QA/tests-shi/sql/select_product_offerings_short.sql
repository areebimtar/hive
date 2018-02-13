-- select product offerings with variation options names they belong to and order by project_id and sequence numbers of both variation options
select product_id, price, sku, quantity, visibility, value1, seq1, value2, seq2 from (
  select * from product_offerings left join (
    select product_offering_id, max(value1) as value1, max(seq1) as seq1, max(value2) as value2, max(seq2) as seq2 from (
      select * from product_offering_options poo left join (
        select vo.id as vo_id, vo.value as value1, vo.sequence as seq1, v.first
        from variation_options vo join variations v on vo.variation_id=v.id where first=true) as sv on poo.variation_option_id=sv.vo_id
      left join (
        select vo.id as vo_id, vo.value as value2, vo.sequence as seq2, v.first from variation_options vo join
        variations v on vo.variation_id=v.id where first=false
      ) as sv2 on poo.variation_option_id=sv2.vo_id
    ) as big group by product_offering_id
  ) po_vo on product_offerings.id=po_vo.product_offering_id
) as final order by product_id, seq1, seq2;
