# Workers Manager for Hive

### Configuration

### Database connection settings
```
{
...
  "db": {
    "name": "db1",
    "host": "localhost",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "Do not store password in git.",
    "logQueries": true
    "slowQueriesMinDuration": 2500
  },
...
}
```
Only `user`, `password`. `logQueries` and `slowQueriesMinDuration` fields are supposed to be overridable by `DB_USER`, `DB_PASSWORD`, `DB_LOG_QUERIES`, and `DB_SLOW_QUERIES_MIN_DURATION` environment variables.

### Logging
```
{
...
  "logging": {
    "level": "debug"
  },
...
}
```
Not possible to override by environment variables.

### Server port
```
{
...
  "serverPort": 3344,
...
}
```
This option can be overriden by `HIVE_MANAGER_PORT` environment variable
