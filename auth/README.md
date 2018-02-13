# Hive Authentication Server

The directory hive/auth contains the hive authentication server implementation.

## Usage
```
1) `git clone git@github.com:salsita/hive.git`
2) `cd hive/auth`
3) `yarn install`
4) `. ./local.hive.setup.sh`
4) `yarn run start:dev`
```
Navigate your browser to http://localhost:8000

## Development

Use `hive/auth/local.hive.setup.sh` to create custom settings.

## Configuration

### App server url
```
{
...
  "webUrl": "https://hive-dev.salsitasoft.com:8000",
...
}
```
Can be overriden by `HIVE_WEB_URL` environment variable

### HTTP port, used for redirecting to port 443
```
{
...
  "httpPort": 80,
...
}
```
Can be overriden by `HIVE_HTTP_PORT` environment variable.

### Server options
```
{
...
  "auth": {
    "scheme": "https",
    "host": "hive-dev.salsitasoft.com",
    "port": 443
  },
...
}
```
These options are used for building URL and for running authentication server. They can be overriden by `HIVE_AUTH_SCHEME`, `HIVE_AUTH_HOST` and `HIVE_AUTH_PORT` environment variables.

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

### Mandrill API key
```
{
  ...
  "mandrill": {
    "apikey": "some_api_key"
  }
}
```

This option can be overridden by 'HIVE_AUTH_MANDRILL_APIKEY' environment variable.

### Session options
```
{
...
  "secretKey": "super duper secret key",
  "cookieName": "connect.sid",
  "domain": "https://getvela.com",
  "cookieExpiresIn": null,
  "secureCookie": true,
  "store": {
    "dbConnectionString": "postgresql://hive:12345@localhost/hive"
  }
...
}
```
Can not be overriden.

### Users options
```
  "users": {
    "newUserDbName": "db2"
  }
```
Can not be overriden.

## To do list

See `hive/auth/hive-auth-todo.txt` in the  directory.
