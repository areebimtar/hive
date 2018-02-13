# migrate products from old schema to new schema

Script that we use to force-download products to make sure all of them are on the new (2017/09) schema.
We focus only on the shops that we believe are "healthy", all others will need to be treated outside of
this script.

The script connects to PostgreSQL DB that is specified under `db` key in config JSON file.
It starts with shop id found in config file under `etsy.shopId` key.
If the shop is healthy (in `up_to_date` state), it checks if there are any products from this shop
that are still on the old DB schema (there is a boolean flag for the products in `product_properties`
table). If there are none, it move to next shop (with higher id), or terminates (in case there is no
other shop to check).

In case there are products still on old schema, it takes first `etsy.batchSize` of them and schedules
them to download (i.e. the timestamp of these products is set to `1970-01-01` and so is the timestamp
of last sync for this shop, this will trigger `syncShop` event next time the worker is scheduling
shops for sync).

After that, the script checks every `etsy.delay` milliseconds if the shop is done syncing. Once it is,
it again checks if there are still more products on the same shop to migrate over to the new schema,
or whether the shop is fully migrate and it's time to move on to the next one.

## example config file
```
{
  "db": {
    "host": "prodhivedb.cbjuho5ehxar.us-west-1.rds.amazonaws.com",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "<fill in>",
    "logQueries": false
  },
  "etsy": {
    "shopId": "1",
    "batchSize": 200,
    "delay": 10000
  }
}
```

## Running

1. use webpack to create runnable bundle:
```
$ node ../../node_modules/webpack/bin/webpack.js --config webpack.config.forceDownloadProducts.js
```

2. create a config file according to the description above
```
$ vi config.json
```

3. and then just run it (+ store the log):
```
$ node dist/bundle.js 2>&1 | tee -a run.log
```
