#!/bin/bash
TO_GO=$(psql -X -U $PGUSER -h $PGHOST -P t -P format=unaligned $PGDATABASE -c "select count(1) from product_properties where channel_modification_timestamp is null")
COUNT=$TO_GO

function update() {
  UPDATE_RESULT=$(psql -X -U $PGUSER -h $PGHOST -P t -P format=unaligned $PGDATABASE -f ./populate5ProductProperties.sql)
  UPDATED_CNT=$(echo $UPDATE_RESULT | cut -d" " -f 2)
}

update
while [ $UPDATED_CNT -gt 0 ]
do
  TO_GO=$(($TO_GO-$UPDATED_CNT))
  echo Updated $UPDATED_CNT remaining $TO_GO/$COUNT
  update
done
