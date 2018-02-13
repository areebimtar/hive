#!/bin/bash

set -eu

cd /srv/hive

echo "$CONF" > ./dist/"$SERVER_TYPE"/config.json
date >> "$LOGS"
node ./dist/"$SERVER_TYPE"/server.js >> "$LOGS" 2>&1
