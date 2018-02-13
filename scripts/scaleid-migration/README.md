# HIVE migration script for scale_id_option population (JIRA HIVE-788)

The purpose of this script is to recompute `recipient_id` and `scale_option_id` in `variations` table as have already many records present that needs to be updated once we deploy version 2.0.0.

The script requires few environment properties so it can connect to DB:
 * DB_PASSWORD
 * DB_HOST

There are few others (check code) but the default should work for everyone (actually running without any env should connect to local database).

The script simply connects to DB, downloads all variations into memory, runs them through library to compute correct values, and send UPDATE commands back to database.


## Running

1. use webpack to create runnable bundle:

    node ../../node_modules/webpack/bin/webpack.js --config webpack.config.scaleMigration.js

2. run the bundle with the right env variable (+ store the log):

   DB_PASSWORD='' DB_HOST='' node --max_old_space_size=8096 --initial_old_space_size=1024 dist/bundle.js >log.txt 2>&1 
