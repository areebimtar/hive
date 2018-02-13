When new environments are set up, we add the postgres_fdw extension and
grant rights to the app_db user to use this extension and to create schemas
on the app db.

This script is provided to modify existing localhost databases that were created before
we made these configuration changes.

This script should be run as a postgres superuser on the same host that has the database.
If the database name is hive and the user name is hive, no arguments are required, but they can be overriden
by running this script with the APP_DB and HIVE_USER set to the desired values. example:

```
DB_USER=hiveuser APP_DB=myhivedb ./update-environments.sh
```

This script is not for RDS instances.
