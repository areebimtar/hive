# migrate all users from DB2 to (main / single) DB

Script to migrate all users from DB2 to (main / single) DB.

## example config file
```
{
  "db-master": {
    "host": "prodhivedb-master.cbjuho5ehxar.us-west-1.rds.amazonaws.com",
    "port": 5432,
    "database": "hive_master",
    "user": "hive",
    "password": "<fill in>",
    "logQueries": false
  },
  "db2": {
    "host": "prodhivedb-2.cbjuho5ehxar.us-west-1.rds.amazonaws.com",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "<fill in>",
    "logQueries": false
  }
}
```

## Running

1. use webpack to create runnable bundle:
```
$ node ../../node_modules/webpack/bin/webpack.js --config webpack.config.migrateUsersToSingleDB.js
```

2. create a config file according to the description above
```
$ vi config.json
```

3. and then just run it (+ store the log):
```
$ node dist/bundle.js 2>&1 | tee -a run.log
```
