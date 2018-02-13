## Manager Server config

#### db.host
_obvious_ [fully qualified URL | IP address] (eg: localhost)
#### db.port
_obvious_ [port number] (eg: 5432)
#### db.database
_obvious_. Can be set via DB_NAME [string] (eg: hive)
#### db.user
_obvious_. Can be set via DB_USER [string] (eg: hive)
#### db.password
_obvious_. Can be set via DB_PASSWORD [string] (eg: hive)
#### db.logQueries
If true, all queries to DB will be logged [true | false]

#### logging.consoleLevel
Log level for logger [debug, info, errors] (eg: debug)
#### logging.loggly.logLevel
Log level for logger. Can be set via LOGGLY_LOG_LEVEL [debug, info, errors] (eg: debug)
#### logging.loggly.token
_obvious_. Can be set via LOGGLY_TOKEN [string]
#### logging.loggly.serverType
_obvious_ [string] (eg: hive)
#### logging.loggly.velaEnvironment
tag messages in loggly so messages from QA are not mixed up with prod env. Can be set via VELA_ENVIRONMENT [string]

#### manager.dailyQuotaReserve
_obvious_ [number]
#### manager.rateLimitPerSecond
_obvious_ [number]
#### manager.APIPort
_obvious_. Can be set via HIVE_MANAGER_API_PORT [port number]

#### rabbitmq.uri
Connection string to RabbitMQ. Can be set via RABBIT_URI [connection string] (eg: amqp://user1:pass1@localhost/vela)
