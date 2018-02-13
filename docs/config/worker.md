## Worker Server config

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

#### etsy.consumerKey
_obvious_. Can be set via ETSY_KEY [string]
#### etsy.consumerSecret
_obvious_. Can be set via ETSY_SECRET [string]
#### etsy.apiUrl
Etsy API server. Can be set via ETSY_API_URL [fully qualified URL] (eg: https://openapi.etsy.com/v2)
#### etsy.maxListingsInShop
Shops with more listings will not be synchronized [number]
#### etsy.auth.requestTokenURL
_obvious_. Can be set via ETSY_REQUEST_TOKEN_URL [fully qualified URL] (eg: https://openapi.etsy.com/v2/oauth/request_token)
#### etsy.auth.accessTokenURL
_obvious_. Can be set via ETSY_ACCESS_TOKEN_URL [fully qualified URL] (eg: https://openapi.etsy.com/v2/oauth/access_token)
#### etsy.auth.userAuthorizationURL
_obvious_. Can be set via ETSY_USER_AUTHORIZATION_URL [fully qualified URL] (eg: https://openapi.etsy.com/v2/oauth/request_token)

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

#### auth.prefix
Prefix is used in composing API request and redirects to Auth server [string] (eg: /auth)

#### rabbitmq.uri
Connection string to RabbitMQ. Can be set via RABBIT_URI [connection string] (eg: amqp://user1:pass1@localhost/vela)
#### roles.syncShops
Worker will sync Etsy shops
#### roles.applyOperations
Worker will process ApplyOps messages
#### applyOperationsQueue
Name of the queue from where this worker will consume ApplyOps messages - they are db dependent! [string] (eg: apply-operations)
#### serverScheme
Which schema will be used [http, https]
#### serverDomain
_obvious_ [string]
#### serverPort
_obvious_ [port number]
#### terminateOnDisconnect
_obvious_ [true | false]
