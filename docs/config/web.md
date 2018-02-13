## Web Server config

#### loginPage
URL where is the Auth server. User is redirected to this URL on logout. Can be set via HIVE_LOGIN_PAGE [fully qualified URL] (eg: https://hive-dev.salsitasoft.com)
#### logoutPage
_obvious_. Can be set via HIVE_LOGOUT_PAGE [fully qualified URL] (eg: https://hive-dev.salsitasoft.com)
#### customSignupPage
URL where new users are redirected. Can be set via HIVE_SIGNUP_PAGE [null | fully qualified URL] (eg: https://hive-dev.salsitasoft.com)
#### httpPort
Port on which redirect server listens. This server only redirects to HTTPS server. Can be set via HIVE_HTTP_PORT [port number] (eg: 80)

### session.secretKey
Secret key used for signing session id cookie. [string] (eg: super duper secret key)
### session.secureCookie
Secure flag set on cookie (needs HTTPS) [true|false]
#### session.cookieDomain
Domain from Auth cookie must match this domain. [fully qualified URL] (eg: https://hive-stage.salsitasoft.com)
#### session.cookieName
_obvious_ [string] (eg: access_token)
### session.cookieExpiresIn
_obvious_ [number]
### session.store.dbConnectionString
connection string to postgres DB where session info is stored [string] (eg: postgresql://hive:12345@localhost/hive)

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

#### auth.prefix
Prefix is used in composing API request and redirects to Auth server [string] (eg: /auth)

#### etsy.consumerKey
_obvious_. Can be set via ETSY_KEY [string]
#### etsy.consumerSecret
_obvious_. Can be set via ETSY_SECRET [string]
#### etsy.apiUrl
Etsy API server. Can be set via ETSY_API_URL [fully qualified URL] (eg: https://openapi.etsy.com/v2)
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

#### serverScheme
Which schema will be used for main server. Can be set via SERVER_SCHEME [http, https]
#### serverDomain
_obvious_. Can be set via SERVER_DOMAIN [string]
#### serverPort
_obvious_. Can be set via PORT
#### intercom.secureModeSecretKey
_obvious_. Can be set via HIVE_INTERCOM_SECURE_MODE_SECRET_KEY [string]

#### rabbitmq.uri
Connection string to RabbitMQ. Can be set via RABBIT_URI [connection string] (eg: amqp://user1:pass1@localhost/vela)

#### frontendVars.welcomeUrl
_obvious_ [fully qualified URL]
#### frontendVars.mixpanelToken
_obvious_ [string]
#### frontendVars.intercomAppId
_obvious_ [string]

#### syncUpdatesBatchSize
How many products/listings will be processed at once during sync updates API call