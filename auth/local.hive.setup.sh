# Default localhost configuration for the authentication server.

./auth/create_ssc.sh

export HIVE_WEB_URL="https://localhost:13000"
export HIVE_HTTP_PORT="8000"

export HIVE_AUTH_SCHEME="https"
export HIVE_AUTH_HOST="localhost"
export HIVE_AUTH_PORT="44300"

export HIVE_PRIVATE_KEY="dist/auth/server/cert/private_key.rsa"
export HIVE_PUBLIC_KEY="dist/auth/server/cert/public_key.rsa"
export HIVE_CERTIFICATE="dist/auth/server/cert/server.crt"

export SERVER_PORT=4000
