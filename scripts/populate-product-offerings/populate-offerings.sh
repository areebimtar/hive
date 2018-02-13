#!/bin/bash
COUNTER=0
SHOP_ID=0
: ${LIMIT:=1}

while [ $SHOP_ID -gt -1 ] && [ $COUNTER -lt $LIMIT ]; do
    SECONDS=0
    let SHOP_ID=$(($(LC_ALL='en_US.UTF-8' LESS=-SqgimnqR PGPASSWORD=$DB_PASSWORD psql -t -h $DB_HOST -U hive -d hive -c "select * from updateNextShop()")))
    let COUNTER=COUNTER+1
    echo "Populated shop:  $SHOP_ID in $SECONDS seconds"
done
