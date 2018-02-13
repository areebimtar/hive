# Worker for Hive

### Configuration
By default, worker as other application expect to see `config.json` near its `server.js`, but you can pass custom config file path via `HIVE_CONFIG` environment variable. You may want to dump config which is used in app to check if proper config has been loaded, you can enable this by `DUMP_CONFIG` environment variable, config will be dumped to debug log right after app start.

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
    "logQueries": true,
    "slowQueriesMinDuration": 2500
  },
...
}
```
Only `user`, `password`. `logQueries` and `slowQueriesMinDuration` fields are supposed to be overridable by `DB_USER`, `DB_PASSWORD`, `DB_LOG_QUERIES`, and `DB_SLOW_QUERIES_MIN_DURATION` environment variables.

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

### Synchronization manager URL
```
{
...
  "syncManager" : {
    "url": "http://localhost:1234"
  }
...
}
```
Can be overriden by `HIVE_SYNC_MANAGER_URL`.

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

### Terminate on disconnect
```
{
...
  "terminateOnDisconnect": true
...
}
```
If worker got disconnected from the manager, it should immediately terminate itself. Can be overriden by 'TERMINATE_ON_DISCONNECT' environment variable.

### Stubs
```
{
...
  "auth": {
    "prefix": ""
  },
  "serverScheme": "",
  "serverDomain": "",
  "serverPort": "",
...
}
```
Those values should remain empty, they are used for building `callbackUrl` in depth of Etsy auth, and this `callbackUrl` is not used in worker.
