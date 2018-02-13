## Auth Server config

#### webUrl
URL of web servers. Can be set via HIVE_WEB_URL [string] (eg: connect.sid)
#### httpPort
Port on which redirect server listens. This server only redirects to HTTPS server. Can be set via HIVE_HTTP_PORT [port number] (eg: 80)
#### cookieExpiresIn
how long will cookie be valid in seconds [null | number] (eg: 3600 for 1 hour)

#### auth.scheme
_obvious_. Can be set via HIVE_AUTH_SCHEME [http | https]
#### auth.host
_obvious_. Can be set via HIVE_AUTH_HOST [string]
#### auth.port
_obvious_. Can be set via HIVE_AUTH_PORT [port number]

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
_obvious_. Can be set via AUTH_DB_NAME [string] (eg: hive)
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

#### mandrill.apikey
_obvious_. Can be set via HIVE_AUTH_MANDRILL_APIKEY [string]

#### frontendVars.welcomeUrl
_obvious_ [fully qualified URL]
#### frontendVars.mixpanelToken
_obvious_ [string]
#### frontendVars.intercomAppId
_obvious_ [string]
