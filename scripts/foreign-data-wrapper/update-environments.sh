#!/usr/bin/env bash
: ${HIVE_USER:=hive}
: ${APP_DB:=hive}

psql -v ON_ERROR_STOP=1 -d $APP_DB -c "CREATE EXTENSION IF NOT EXISTS postgres_fdw;"
psql -v ON_ERROR_STOP=1 -d $APP_DB -c "GRANT USAGE ON FOREIGN DATA WRAPPER postgres_fdw TO $HIVE_USER;"
psql -v ON_ERROR_STOP=1 -d $APP_DB -c "GRANT CREATE ON DATABASE $APP_DB TO  $HIVE_USER;"
