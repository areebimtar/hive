# Hive Web Server

The hive/web directory contains the hive web server implementation.

1. [Usage](#usage)
2. [Development](#development)
3. [Configuration](#configuration)
  1. [Turn off user login](#turn-off-user-login)
  2. [Keys and certificates](#keys-and-certificates)
  3. [Login page url](#login-page-url)
  4. [Database connection settings](#database-connection-settings)
  5. [Channel authentication](#channel-authentication)
  6. [Etsy channel integration options](#etsy-channel-integration-options)
4. [Configure PostgreSQL](#configure-postgresql)


## Usage

```
1) git clone git@github.com:salsita/hive.git
2) Configure PostgreSQL.
3) cd hive
4) yarn install
5) . ./web/local.setup.sh
6) yarn run dev_web
```

## Development

Use `hive/web/local.setup.sh` to create custom settings.

## Configuration

Config file consist of several sections:

### Login page url

Requests will be redirected to this url when the user is not logged in.
```
{
  ...
  "loginPage": "https://hive-dev.salsitasoft.com",
  ...
}
```
This option can be overriden by environment variable `HIVE_LOGIN_PAGE`.

### Logout page url

Requests will be redirected to this url when the user decided to logout.
```
{
  ...
  "logoutPage": "https://hive-dev.salsitasoft.com/logout",
  ...
}
```

### Keys and certificates
```
{
  ...
  "crypto": {
    "privateKey": "/srv/hive/cert/hive_2016.key",
    "publicKey": "/srv/hive/cert/hive_2016.public.key",
    "certificate": "/srv/hive/cert/hive_bundle_2016.crt"
  }
  ...
}
```
These options can be overriden by `HIVE_PRIVATE_KEY`, `HIVE_PUBLIC_KEY` and `HIVE_CERTIFICATE` environment variables.

### Database connection settings
```
{
...
  "db": {
    "db1": {
      "host": "localhost",
      "port": 5432,
      "database": "hive",
      "user": "hive",
      "password": "Do not store password in git.",
      "logQueries": true,
      "slowQueriesMinDuration": 2500
    }
  },
...
}
```
Only `user`, `password`. `logQueries` and `slowQueriesMinDuration` fields are supposed to be overridable by `DB_USER`, `DB_PASSWORD`, `DB_LOG_QUERIES`, and `DB_SLOW_QUERIES_MIN_DURATION` environment variables.

### Channel authentication

This is used for integration with channels.
```
{
...
  "auth": {
    "prefix": "/auth"
  },
...
}
```
Not possible to override by environment variables.

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

### Web server setting
```
{
...
  "serverScheme": "https",
  "serverDomain": "my-domain.com",
  "serverPort": 443
...
}
```
Used for building OAuth callback URL for Etsy
Can be overriden by `SERVER_SCHEME`, `SERVER_DOMAIN` and `PORT` environment variables.

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

### AWS S3 images bucket
```
{
  ...
  "AWS": {
    "images": {
      "region": "us-west-1",
      "bucketName": "images-dev.getvela.com",
      "accessKeyId": 'foo',
      "secretAccessKey": "bar",
      "sslEnabled": true,
      "signedURLExpiration": 10
    }
  }
  ...
}
```
Can be overriden by `AWS_IMAGES_REGION`, `AWS_IMAGES_BUCKET_NAME`, `AWS_IMAGES_ACCESS_KEY_ID`, `AWS_IMAGES_SECRET_KEY`

## Configure PostgreSQL

Here are instructions on how to configure PostgreSQL on Ubuntu 14.04.3.
```
1) sudo apt-get install postgresql
2) sudo bash
3) su - postgres
4) psql
5) create database hive;
6) create user hiveuser login;
7) alter user hiveuser encrypted password 'hive2016';
8) grant all privileges on database hive to hiveuser;
9) ctrl-d This exits the psql command.
10) ctrl-d This exits the postgres shell.
11) As the superuser edit /etc/postgresql/9.3/main/pg_hba.conf if necessary.
to contain the line local hive hiveuser password.
12) Restart PostgreSQL server with service postgresql restart.
13) Populate the hive database:
psql -U hiveuser hive < hive/web/database/db.dump
```

Populating the hive database with the hiveuser is necessary in order
to avoid having to grant the access to every table:
```
hive=> select * from channels;
ERROR:  permission denied for relation channels
hive=>
```

### Edit pg_hba.conf

Editing `/etc/postgresql/9.3/main/pg_hba.conf` is necessary if this error occurs:
```
blackstorm@blackstorm:~/hive/web$ psql hive hiveuser
psql: FATAL:  Peer authentication failed for user "hiveuser"
blackstorm@blackstorm:~/hive/web$
```
For instance adding this line solves it
```
# TYPE DATABASE USER ADDRESS METHOD
# Note the ADDRESS field is empty.
local hive hiveuser password
```
when the user `hiveuser` does not have a Unix account
and the database connection settings contain

```
"db": {
  "database": "hive",
  "user": "hiveuser",
  ...
}
```
