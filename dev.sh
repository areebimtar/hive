#!/usr/bin/env bash

# This script assumes certain pre-requisites:
# 1. the name of the dbuser & password for local postgres dbs hive and auth are setup as hiveuser/hive2016
# 2. at some point in the past you've run "yarn run gen_ver_file"
# 3. to run auth, then at some point in the past you've run "yarn run build_auth_frontend"
# 4. to run web, then at some point in the past you've run "yarn run build_web_frontend"
#
# Note on 3 and 4: if you're using the live reload ports (13001 or 44301) then the built frontend artifacts
# in the dist directory will be irrelevant at runtime, but in order to launch the server checks for them.

MODULE=$1
PROTOCOL=${2-http}
VALID_MODULES="web auth manager worker"
DIRNAME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_usage()
{
	echo
	echo "USAGE for dev.sh"
	echo "./dev.sh web|auth|manager|worker [https]"
	echo
	exit -1
}

set_common_env()
{
	export COOKIES_DOMAIN="localhost"
	export DB_USER="hiveuser"
	export DB_PASSWORD="hive2016"
	export HIVE_PRIVATE_KEY="${DIRNAME}/dist/auth/server/cert/private_key.rsa"
	export HIVE_PUBLIC_KEY="${DIRNAME}/dist/auth/server/cert/public_key.rsa"
	export HIVE_CERTIFICATE="${DIRNAME}/dist/auth/server/cert/server.crt"

	# Uncomment these to do loggly testing
	# export LOGGLY_TOKEN="9f254800-e91a-4ade-b30b-ddb46e898f5b"
	# export VELA_ENVIRONMENT="dev-box"

}

set_web_env()
{
	export HIVE_HTTP_PORT=9000

	export HIVE_LOGIN_PAGE="http://localhost:44300/login"
	export HIVE_LOGOUT_PAGE="http://localhost:44300/logout"
	export HIVE_SIGNUP_PAGE="http://localhost:44300/createAccount"

	export DB_USER="hiveuser"
	export DB_PASSWORD="hive2016"

	export SERVER_SCHEME="http"
	export PORT=13000
	export SERVER_PORT=13000
	export SERVER_DOMAIN=localhost

	export HIVE_SYNC_MANAGER_URL="http://localhost:1234"
	export HIVE_MANAGER_PORT=1234

	#export HIVE_INTERCOM_APP_ID='x3ynxh96'
	#export HIVE_INTERCOM_SECURE_MODE_SECRET_KEY='p6bXaKp5Wy1LvXKI_c5qYsWIjswP3GD72S1oqCX2'
	export ETSY_KEY='vvk0635ljecl7qvlat8h6lpo';
	export ETSY_SECRET='a3fdz078a0';
}

set_auth_env()
{
	./auth/create_ssc.sh

	export HIVE_WEB_URL="http://localhost:13000"
	export HIVE_HTTP_PORT="8000"

    export AUTH_DB_NAME="hive_auth"
	export HIVE_AUTH_SCHEME="http"
	export HIVE_AUTH_HOST="localhost"
	export HIVE_AUTH_PORT="44300"
	export SERVER_PORT=4000
}

run()
{
	SCRIPT=dev_${MODULE}
	yarn run ${SCRIPT}
}

if [[ ! ($PROTOCOL == https || $PROTOCOL == http) ]]; then
	echo "$PROTOCOL is not a valid protocol"
	show_usage
fi

if [[ ! $VALID_MODULES =~ $MODULE ]]; then
	echo "$MODULE not is a valid module"
	show_usage
fi


# input is valid, let's launch
set_common_env
if [[ $MODULE == "auth" ]]; then
	set_auth_env
else
	set_web_env
fi

run
