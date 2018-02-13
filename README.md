# Hive
E-commerce channel manager.

## Overview

```
git clone git@github.com:salsita/hive.git
```

Application consist of four servers: [auth](auth/README.md), [web](web/README.md), [manager](manager/README.md) and [worker](worker/README.md)

See also instructions in respective READMEs and examples below.

## Development environment

Make sure you have NodeJS 7.+ and yarn.

RabbitMQ 3.6+ is needed, for instructions about installation refer to [docs](docs/rabbitmq-dev-setup.md).

Install PostgreSQL 9.5 and run [this script](scripts/foreign-data-wrapper/update-environments.sh)
to configure PostgeSQL fdw extension.

Create PostgreSQL user and 2 databases, one for the app itself and one for authentication. Usually user can be called hive and the databases `hive` and `hive_auth` for app and authentication respectively.

## Installation
```
# install dependencies
yarn install

# build
yarn run build_all
```

## DB migration

To run application DB migration you have to export DB connection string
`export DATABASE_URL="postgresql://DB_USER_NAME:DB_USER_PASSWORD@DB_HOST/DB_DATABASE"`
and then run
`yarn run migrate_app_db`

To run auth DB migration you have to export DB connection string
`export DATABASE_URL="postgresql://DB_USER_NAME:DB_USER_PASSWORD@DB_HOST/DB_DATABASE"`
and then run
`yarn run migrate_auth_db`

Default Auth DB name in application DB migrations (needed for FDW) is `<DB_DATABASE>_auth` (eg `postgresql://user:password@localhost/hive` will use `hive_auth` as name of auth DB name). This bahaviour can be overriden by `AUTH_DB_NAME` env variable

## Running the application

If you have properly configured your development environment, created `hive` and
`hive_auth` databases with their owner `hive`, ran
the DB migration and installed the application you are ready to run it.

First you need to override some server settings. All settings for `manager`, `worker`, `auth` and `web` server are set through `dist\<server_name>\config.json`
files. Some settings can be overriden by environment variables, which is what we'll do now. For **all** servers set following variables:
```
export SERVER="localhost"

# hive settings
export ETSY_KEY="vvk0635ljecl7qvlat8h6lpo"
export ETSY_SECRET="a3fdz078a0"
export DB_USER="hive"
export DB_PASSWORD="12345"
export AUTH_DB_NAME="hive_auth"
export HIVE_INTERCOM_APP_ID="x3ynxh96"
export HIVE_INTERCOM_SECURE_MODE_SECRET_KEY='p6bXaKp5Wy1LvXKI_c5qYsWIjswP3GD72S1oqCX2'
# export DB_PASSWORD="hive2016"
export HIVE_PRIVATE_KEY="/home/salsita/hivecert/private_key.rsa"
export HIVE_PUBLIC_KEY="/home/salsita/hivecert/public_key.rsa"
export HIVE_CERTIFICATE="/home/salsita/hivecert/server.crt"
# Application Server
export HIVE_DISABLE_LOGIN="true"
export HIVE_LOGIN_PAGE="http://$SERVER:44300"
export HIVE_LOGOUT_PAGE="http://$SERVER:44300/logout"
export SERVER_SCHEME="http"
export SERVER_DOMAIN="$SERVER"
export PORT="3000"
# Auth Server
export HIVE_WEB_URL="http://$SERVER:3000"
export HIVE_HTTP_PORT="8000"
export HIVE_AUTH_SCHEME="http"
export HIVE_AUTH_HOST="$SERVER"
export HIVE_AUTH_PORT="44300"
export COOKIES_DOMAIN="$SERVER"
export HIVE_AUTH_MANDRILL_APIKEY="jtclw9QEtJ36PA3PFhfd9g"
# Manager Server
export HIVE_MANAGER_PORT="1234"
export DB_LOG_QUERIES="true"
export HIVE_SYNC_MANAGER_URL="http://$SERVER:1234"
# export LOGGLY_TOKEN="9f254800-e91a-4ade-b30b-ddb46e898f5b"
export VELA_ENVIRONMENT="dev-box"
export DATABASE_URL_APP="postgresql://hive:12345@localhost/hive"
export DATABASE_URL_AUTH="postgresql://hive:12345@localhost/hive_auth"
# AWS S3 images bucket
export AWS_IMAGES_ACCESS_KEY_ID="foo"
export AWS_IMAGES_SECRET_KEY="bar"

export QA_USER_ID=`id -u`
export MAX_PARALLEL_JOBS=1
export PATH=/home/ccg1415/selenium:$PATH
```

for the auth server additionally set these:
```
export HIVE_HTTP_PORT="40090"
```

Now you can run all application's dev servers with following commands:
```
yarn run dev_web
yarn run dev_auth
yarn run dev_manager
yarn run dev_worker
```

> Note: Not all variables in the first configuration block are needed
for all servers. They're there just to simplify the process.

## Tests

- `yarn run tests` will run all tests in a manner they run at CircleCI
- `yarn run build_all` will build all applications without running their tests
- `yarn run build_[web|manager|worker|auth]` will build specified application
- `yarn run build_[web|manager|worker|auth]_backend` will build backend of specified application
- `yarn run build_[web|auth]_frontend` will build frontend of specified application (manager and worker does not have frontend)
- `yarn run lint` will run lint over all applications
- `yarn run lint_[web|auth|manager|worker]` will run lint over specified application
- `yarn run dev_[web|auth|manager|worker]`  will run specified application in development mode (under webpack with hot load)


## Configuration
Documentation of various parameters can be found in following documentation files:
* [Auth server](docs/config/auth.md)
* [Web server](docs/config/web.md)
* [Manager server](docs/config/manager.md)
* [Worker server](docs/config/worker.md)

### Example configuration for hive/web

To only run the web server and via http, have these environment variables set:
```
SERVER_SCHEME="http"
```

Example:
```
export ETSY_KEY='vvk0635ljecl7qvlat8h6lpo';
export ETSY_SECRET='a3fdz078a0';

export DB_PASSWORD='xy6576r4';
export DB_USER='postgres';

export SERVER_SCHEME='http';
export SERVER_DOMAIN='macbook-evgeny.local';
export SERVER_PORT=3000;

export COOKIES_DOMAIN='macbook-evgeny.local';

export HIVE_PRIVATE_KEY='/Users/evgeny/Dev/repo/hive/web/private_key.rsa';
export HIVE_PUBLIC_KEY='/Users/evgeny/Dev/repo/hive/web/public_key.rsa';
export HIVE_CERTIFICATE='/Users/evgeny/Dev/repo/hive/web/server.crt';

export HIVE_LOGIN_PAGE='https://macbook-evgeny.local:43000';

export HIVE_SYNC_MANAGER_URL='http://localhost:1234';

export HIVE_INTERCOM_APP_ID='x3ynxh96'
export HIVE_INTERCOM_SECURE_MODE_SECRET_KEY='p6bXaKp5Wy1LvXKI_c5qYsWIjswP3GD72S1oqCX2'
```

### Example configuration for hive/auth and hive/web

This is example for how to run hive/web over https with user authorization.

The `SERVER_PORT` setting takes effect when the development auth and web builds
are run (`yarn run dev_auth`, `yarn run dev_web`), to differentiate
the webpack ports. Otherwise running one of the two commands
fails silently.

### Auth server environment configuration
```
export HIVE_WEB_URL="https://localhost:13000"
export HIVE_HTTP_PORT="8000"

export HIVE_AUTH_SCHEME="https"
export HIVE_AUTH_HOST="localhost"
export HIVE_AUTH_PORT="44300"

export SERVER_PORT=4000

export HIVE_PRIVATE_KEY="dist/auth/server/cert/private_key.rsa"
export HIVE_PUBLIC_KEY="dist/auth/server/cert/public_key.rsa"
export HIVE_CERTIFICATE="dist/auth/server/cert/server.crt"

export HIVE_AUTH_MANDRILL_APIKEY="apikey"

export ACCESS_COOKIE_NAME='access'
export COOKIES_DOMAIN='hive.example.com'

export AUTH_DB_NAME='hive_auth'
export DB_PASSWORD="hive2016"
export DB_USER="hiveuser"

export LOGGLY_LOG_LEVEL='info'
export LOGGLY_TOKEN='sdasrwerw'
export VELA_ENVIRONMENT='unspecified'

```

### Web server environment configuration
```
export HIVE_PRIVATE_KEY="dist/auth/server/cert/private_key.rsa"
export HIVE_PUBLIC_KEY="dist/auth/server/cert/public_key.rsa"
export HIVE_CERTIFICATE="dist/auth/server/cert/server.crt"

export HIVE_LOGIN_PAGE="https://localhost:44300"
export HIVE_LOGOUT_PAGE="https://localhost:44300/logout"
export HIVE_SIGNUP_PAGE='https://hive.example.com/createAccount'

export DB_USER="hiveuser"
export DB_PASSWORD="hive2016"
export DB_NAME='hive';

export SERVER_SCHEME="https"
export PORT="13000"
export HIVE_HTTP_PORT='80'

export HIVE_SYNC_MANAGER_URL="http://localhost:1234"

export ETSY_KEY="vvk0635ljecl7qvlat8h6lpo"
export ETSY_SECRET="a3fdz078a0"
export ETSY_REQUEST_TOKEN_URL='https://openapi.etsy.com/v2/oauth/request_token'
export ETSY_ACCESS_TOKEN_URL='https://openapi.etsy.com/v2/oauth/access_token'
export ETSY_USER_AUTHORIZATION_URL='https://www.etsy.com/oauth/signin'
export ETSY_API_URL='https://openapi.etsy.com/v2'

export SERVER_DOMAIN='hive.example.com'
export COOKIES_DOMAIN='hive.example.com'
export SESSION_COOKIE_NAME='access_token'
export ACCESS_COOKIE_NAME='access'

export HIVE_INTERCOM_SECURE_MODE_SECRET_KEY='dexxwe42425e'

export LOGGLY_LOG_LEVEL='info'
export LOGGLY_TOKEN='sdasrwerw'
export VELA_ENVIRONMENT='unspecified'
```

### Worker server environment configuration
```
export DB_LOG_QUERIES='true'
export DB_NAME='hive';
export DB_PASSWORD='xy6576r4';
export DB_USER='postgres';

export ETSY_ACCESS_TOKEN_URL='https://openapi.etsy.com/v2/oauth/access_token'
export ETSY_KEY='vvk0635ljecl7qvlat8h6lpo'
export ETSY_REQUEST_TOKEN_URL='https://openapi.etsy.com/v2/oauth/request_token'
export ETSY_SECRET='a3fdz078a0'
export ETSY_USER_AUTHORIZATION_URL='https://www.etsy.com/oauth/signin'
export ETSY_API_URL='https://openapi.etsy.com/v2'

export HIVE_SYNC_MANAGER_URL='http://localhost:8080';

export LOGGLY_LOG_LEVEL='info'
export LOGGLY_TOKEN='sdasrwerw'
export VELA_ENVIRONMENT='unspecified'

export TERMINATE_ON_DISCONNECT='true'
```

### Manager server environment configuration
```
export DB_LOG_QUERIES='true'
export DB_NAME='hive';
export DB_PASSWORD='xy6576r4';
export DB_USER='postgres';

export HIVE_MANAGER_API_PORT='1235'
export HIVE_MANAGER_PORT='8080'

export LOGGLY_LOG_LEVEL='info'
export LOGGLY_TOKEN='sdasrwerw'
export VELA_ENVIRONMENT='unspecified'
```
