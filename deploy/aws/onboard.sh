#!/bin/bash
set -e

# Onboarding script for existing shops from myhiveonline.com.
#
# Usage:   ./onboard.sh <user>                   <token>                        <secret>   <etsy_shop_id> <shop_name>
# Example: ./onboard.sh user@homesteaderchic.org 239dde2a08e1b3732bc07d1998f99b e1e456d2be 8659436        MapDesigns
#
# Script creates user (with default password), company for this user,
# and shop that belongs to the company based on provided input values.
# Shop listings are then synchronised from Etsy automatically, since
# the shop is created with synchronisation status "incomplete" and last
# synchronisation timestamp in the past.


# TODO: before you run the script, replace the placeholders with real values:
DB_HOST='prodhivedb.cbjuho5ehxar.us-west-1.rds.amazonaws.com'
PG_PASSWORD='.oO'
DEFAULT_PASS_HASH='$2a$10$CfMtikbxp1cVQrT32klgDu0rcRoA6vG7UvhaKn6WasXKh5OEa85qC'



# postresql DB
PG_USER=hive
AUTH_DB='hive_auth'
DATA_DB='hive'

export LC_ALL='en_US.UTF-8'

# logging helper functions
die() { printf "ERROR: %s\n" "$*"; exit 1; }
log() { printf "* %s\n" "$*"; }

# escape string:
#   single apostrophe --> double apostrophes
#   wrap the whole string into single apostrophes
db_str() {
  printf "%s" "$1" | sed -e "s/'/''/g" -e "s/^/'/" -e "s/$/'/"
}

# execute SQL query
run_sql() {
  local db=$1 sql=$2 result_var=$3 _run_sql_result
  [ $# -eq 3 ] || die 'run_sql db=$1 sql=$2 result_var=$3'

  _run_sql_result=$(printf "%s;\n" "$sql" | PGPASSWORD=$PG_PASSWORD psql -U $PG_USER -h $DB_HOST --no-align --tuples-only -d $db)
  eval "$result_var=\$_run_sql_result"
}

# find existing company_id for given user
get_user_company_id() {
  local user=$1 result_var=$2 user_esc
  [ $# -eq 2 ] || die 'get_user_company_id user=$1 result_var=$2'

  user_esc=$(db_str "$user")
  run_sql "$AUTH_DB" "SELECT company_id FROM users WHERE name = $user_esc" "$result_var"
}

# get new company id
create_company() {
  local result_var=$1 response
  [ $# -eq 1 ] || die 'create_company result_var=$1'

  run_sql "$AUTH_DB" "INSERT INTO companies SELECT nextval('company_id_seq') RETURNING id" response
  response=($response)
  if [ "${response[1]} ${response[2]} ${response[3]}" = "INSERT 0 1" ]; then
    eval "$result_var=\${response[0]}"
  else
    die "cannot insert company"
  fi
}

# create new user id for created company id
create_user() {
  local user=$1 company_id=$2 result_var=$3 response user_esc pass_hash_esc
  [ $# -eq 3 ] || die 'create_user user_name=$1 company_id=$2 result_var=$3'

  user_esc=$(db_str "$user")
  pass_hash_esc=$(db_str "$DEFAULT_PASS_HASH")
  run_sql "$AUTH_DB" "INSERT INTO users (name, hash, company_id, db) VALUES ($user_esc, $pass_hash_esc, $company_id, 'db1') RETURNING id" response
  response=($response)
  if [ "${response[1]} ${response[2]} ${response[3]}" = "INSERT 0 1" ]; then
    eval "$result_var=\${response[0]}"
  else
    die "cannot insert user"
  fi
}

# create new account for given comapny id, token and secret
create_account() {
  local company_id=$1 token=$2 secret=$3 result_var=$4 response token_esc secret_esc _create_account_id
  [ $# -eq 4 ] || die 'create_account company_id=$1 token=$2 secret=$3 result_var=$4'

  token_esc=$(db_str "$token")
  secret_esc=$(db_str "$secret")

  # check if account exists
  run_sql "$DATA_DB" "SELECT id FROM accounts WHERE oauth_token = $token_esc) OR oauth_token_secret = $secret_esc;" response
  [ -z "$response" ] || die "account already exists ($response)"

  # insert token
  run_sql "$DATA_DB" "INSERT INTO accounts (id, company_id, channel_id, oauth_token, oauth_token_secret) SELECT nextval('account_id_seq'), $company_id, 1, $token_esc, $secret_esc  RETURNING id" response
  response=($response)
  if [ "${response[1]} ${response[2]} ${response[3]}" = "INSERT 0 1" ]; then
    _create_account_id=${response[0]}
  else
    die "cannot insert account token"
  fi

  eval "$result_var=\$_create_account_id"
}

# for given account create new shop with given id and name
create_shop() {
  local account_id=$1 channel_shop_id=$2 shop_name=$3 result_var=$4 response shop_id_esc name_esc _create_shop_id
  [ $# -eq 4 ] || die 'create_shop account_id=$1 channel_shop_id=$2 shop_name=$3'

  shop_id_esc=$(db_str "$channel_shop_id")
  name_esc=$(db_str "$shop_name")

  # check if shop exists
  run_sql "$DATA_DB" "SELECT id FROM shops WHERE (channel_shop_id = $shop_id_esc OR name = $name_esc) AND (account_id = $account_id);" response
  [ -z "$response" ] || die "shop already exists ($response)"

  # insert data
  run_sql "$DATA_DB" "INSERT INTO shops (account_id, channel_shop_id, name, last_sync_timestamp, sync_status) VALUES ($account_id, $shop_id_esc, $name_esc, '2003-08-14 22:18:39-07', 'incomplete') RETURNING id" response
  response=($response)
  if [ "${response[1]} ${response[2]} ${response[3]}" = "INSERT 0 1" ]; then
    _create_shop_id=${response[0]}
  else
    die "cannot insert shop channelShopId"
  fi

  eval "$result_var=\$_create_shop_id"
}


# ---------------- Main ----------------
[ $# -eq 5 ] || die "Usage: $0 <user> <token> <secret> <etsy_shop_id> <shop_name>"

user=$1
token=$2
secret=$3
etsy_shop_id=$4
shop_name=$5

log "checking user $user"
get_user_company_id "$user" company_id
if [ -z "$company_id" ]; then
  log "creating company"
  create_company company_id
  log "company_id = $company_id"

  log "creating user $user with company $company_id"
  create_user "$user" "$company_id" user_id
  log "user_id = $user_id"
else
  log "user $user already exists (company_id=$company_id)"
fi

log "creating account $token / $secret"
create_account "$company_id" "$token" "$secret" account_id
log "account_id = $account_id"

log "creating shop $shop_name ($etsy_shop_id)"
create_shop "$account_id" "$etsy_shop_id" "$shop_name" shop_id
log "shop_id $shop_id"
echo SUCCESS
