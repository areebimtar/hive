# Operation Handlers

### Configuration
By default, handlers as other processes expect to see `config.json` near its `server.js`, but you can pass custom config file path via `HIVE_CONFIG` environment variable. You may want to dump config which is used in app to check if proper config has been loaded, you can enable this by `DUMP_CONFIG` environment variable, config will be dumped to debug log right after app start.

### Database connection settings
```
{
...
  "db": {
    "host": "localhost",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "Do not store password in git.",
    "logQueries": true
  },
...
}
```
Only `user`, `password`. `logQueries` and `slowQueriesMinDuration` fields are supposed to be overridable by `DB_USER`, `DB_PASSWORD`, `DB_LOG_QUERIES` environment variables.

### RabbitMQ connection settings
The default setting expects RabbitMQ to be installed locally on the box. For production and any other environments that require a separate rabbitmq deployment,
the uri should be provided in standard amqp notation with username/password specified in the url (e.g. `amqp://username:password@smart-turtle.rmq.cloudamqp.com/gogyfdtj`)
```
{
...
  "rabbitmq": {
    "uri": "amqp://localhost"
  }
...
}
```

### Etsy channel integration options
```
{
...
  "etsy": {
    "apiUrl": "https://openapi.etsy.com/v2",
    "auth": {
      "requestTokenURL": "https://openapi.etsy.com/v2/oauth/request_token",
      "accessTokenURL": "https://openapi.etsy.com/v2/oauth/access_token",
      "userAuthorizationURL": "https://www.etsy.com/oauth/signin",
      "consumerKey": "Do not store Etsy consumer key in git",
      "consumerSecret": "Do not store Etsy consumer secret in git"
    }
  },
...
}
```
Only `consumerKey` and `consumerSecret` fields are supposed to be overridable by `ETSY_KEY` and `ETSY_SECRET` environment variables.

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
