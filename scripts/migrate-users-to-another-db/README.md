# migrate users from one DB to another DB

Script to migrate users (given their email addresses) from one DB to another DB.

The script works with the "users" and "session" table from `db-auth` and moves the users listed in `users` config array
(their email addresses) from `db-from` to `db-to` (all from config JSON file), affecting tables "accounts", "shops",
"user_profiles" and all tables holding the shop data.

When the a user is moved to new DB, all their shop data from original DB is removed.

When waiting for sync to finish (in target DB) we use `sync.delay` period for polling the DB.

## example config file
```
{
  "users": [
    "user1@to.move",
    "user2@to.move"
  ]
  "db-auth": {
    "host": "prodhivedb.cbjuho5ehxar.us-west-1.rds.amazonaws.com",
    "port": 5432,
    "database": "hive_auth",
    "user": "hive",
    "password": "<fill in>",
    "logQueries": false
  },
  "db-from": {
    "name": "db1",
    "host": "prodhivedb.cbjuho5ehxar.us-west-1.rds.amazonaws.com",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "<fill in>",
    "logQueries": false
  },
  "db-to": {
    "name": "db3",
    "host": "prodhivedb.cbjuho5ehxar.us-west-1.rds.amazonaws.com",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "<fill in>",
    "logQueries": false
  },
  "sync": {
    "delay": 10000
  }
}
```

## Running

1. use webpack to create runnable bundle:
```
$ node ../../node_modules/webpack/bin/webpack.js --config webpack.config.js
```

2. create a config file according to the description above
```
$ vi config.json
```

3. and then just run it (+ store the log):
```
$ node dist/bundle.js 2>&1 | tee -a run.log
```
