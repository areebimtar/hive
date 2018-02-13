#!/bin/bash
set -e

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# CONFIG
. ./install-hive.cfg &>/dev/null || { log "WARNING: config file 'install-hive.cfg' not found"; }


# REQUIRED VARS
# RABBIT_MGMT_URL="https://smart-turtle.rmq.cloudamqp.com"
PARAMS="PG_HOST PG_HIVE_PASSWORD RABBIT_MGMT_URL RABBIT_USER RABBIT_PWD CCI_TOKEN AWS_ACCESS_KEY AWS_SECRET_KEY NODE_VERSION"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# FIX LOCALES
fix_locale

# EXPORT VARS
export_vars

# NTP
install_ntp

# PSQL client
log "Installing PSQL client"
echo "deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main" > /etc/apt/sources.list.d/pgdg.list
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get -qq update
apt-get -qq install -y postgresql-client-common
apt-get -qq install -y postgresql-client-9.4


#CREATE DATABASE
log "Creating main db"
printf "create database hive;\n" | PGPASSWORD="$PG_HIVE_PASSWORD" psql -h "$PG_HOST" -U hive -d postgres

# ADD HIVE USER/GROUP
add_hive_user


# INSTALL NODEJS
install_nodejs


# INSTALL CCI-PINGU
install_ccipingu
cat > /srv/hive/cci-pingu/config/hive-manager.conf << EOF
{
  "organisation": "salsita",
  "hosting": "github",
  "interval": 60,
  "directory": "/srv/hive",
  "timeout": 45,
  "token": "$CCI_TOKEN",
  "project": "hive",
  "branch": "release",
  "artifacts": [
    "manager.tgz",
    "migrations-app.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive-manager.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-manager.conf


# INSTALL JSON-MERGE TOOL
install_jsonmerge_tool

# SERVER UPSTART SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating Manager upstart scripts"
cat > /etc/init/hive-manager.conf << EOF
description "Hive Manager Service"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current/

exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./dist/manager/server.js 1>>/var/log/hive/hive-manager.log 2>&1'
EOF

# HELPERS
log "Installing helper functions"
cat > /usr/local/bin/start-hive-manager.sh << EOF
#!/bin/bash
/sbin/start hive-manager
EOF
cat > /usr/local/bin/stop-hive-manager.sh << EOF
#!/bin/bash
/sbin/stop hive-manager
EOF
chmod 755 /usr/local/bin/start-hive-manager.sh /usr/local/bin/stop-hive-manager.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive-manager.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive-manager.sh' /etc/sudoers


log "Configuring Manager log files"


# HIVE-MANAGER LOG FILE
log "Configuring Manager Server log file"
initiate_logging "hive-manager"

log "Creating Manager configuration patch files"

# CONFIG FILES PATCHES
cat > /srv/hive/patch-manager-config.json << EOF
{
  "db": {
    "host": "$PG_HOST",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "$PG_HIVE_PASSWORD",
    "logQueries": true
  },
  "serverPort": 8080
}
EOF
chown hive:hive /srv/hive/patch-manager-config.json


# CCI UPDATE SCRIPT (GETS NAME OF DIR WITH CCI ARTIFACTS)
log "Creating Manager update script"
cat > /srv/hive/.cci-update-hive-manager.sh << EOF
#!/bin/bash
set -e

DB_PWD="$PG_HIVE_PASSWORD"
DB_HOST="$PG_HOST"

export RABBIT_MGMT_URL="$RABBIT_MGMT_URL"
export RABBIT_USER="$RABBIT_USER"
export RABBIT_PASSWORD="$RABBIT_PWD"

DIR="\$1"
cd "\$DIR"
echo "Hive Manager Server: installation of \$DIR started."
echo "+ unpacking artifacts"
tar xfz manager.tgz
tar xfz migrations-app.tgz
echo "+ stopping Hive Application Server"
sudo /usr/local/bin/stop-hive-manager.sh || true
echo "+ migrating AS DB (only if needed)"
COUNT_DB=\`PGPASSWORD="\${DB_PWD}" psql -h "\$DB_HOST" -U hive -d hive -t -c 'select count(*) from pgmigrations;' || echo "ERROR"\`
if [ \$COUNT_DB = "ERROR" ]; then COUNT_DB=0; fi
echo "  - migrations in DB: \$COUNT_DB"
COUNT_DISK=\`ls -1 migrations-app/*.js | wc -l\`
echo "  - migrations in build: \$COUNT_DISK"
export DATABASE_URL="postgresql://hive:\${DB_PWD}@\${DB_HOST}/hive"
if [ \$COUNT_DISK -ge \$COUNT_DB ]
then
  echo "  - performing UP migration"
  ./node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ./migrations-app -v up
else
  STEPS=\`expr \$COUNT_DB \- \$COUNT_DISK\`
  echo "  - performing DOWN(\${STEPS}) migration"
  ../current/node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ../current/migrations-app -v down \$STEPS
fi
cd ..
echo "+ linking new Hive Application Server version"
rm -f current
ln -s "\$DIR" current
echo "+ updating config files"
cd current/dist/manager
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-manager-config.json > config.json
echo "+ starting new Hive Manager Server"
sudo /usr/local/bin/start-hive-manager.sh
echo "Hive Application Server: installation completed."
EOF
chown hive:hive /srv/hive/.cci-update-hive-manager.sh
chmod 755 /srv/hive/.cci-update-hive-manager.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e
set -o pipefail

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-manager.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-manager.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
else
  echo "usage: ./UPDATE.sh [build-number]"
  echo "if [build-number] is not specified, the latest build from CCI is used."
fi
EOF
chown hive:hive /srv/hive/UPDATE.sh
chmod 755 /srv/hive/UPDATE.sh

# DOWNLOAD LOGGIN TOOL, INSTALL DEPENDENCIES AND CREATE CRONJOB
cloudwatch_init

# INITIATE THE FIRST INSTALL
log "Installing Hive"
su - -c "/srv/hive/UPDATE.sh" hive

# INITIATE REGULAR DB CLEANSING
mkdir -p /root/db-scripts
cat > /root/db-scripts/purge-old-syncShops-rows.sh << 'EOF'
#!/bin/bash

set -euo pipefail

psql_run_cmd() {
  [ $# = 2 ] || ( echo "provide connection_string and command" ; exit 1 );
  CONN="$1"
  CMD="$2"
  psql "$CONN" -c "$CMD"
}

date

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
DELETE_DONE_2D="delete from task_queue where operation='syncShop' and state='done' and created_at < now() - interval '2 days';"
DELETE_ALL_5D="delete from task_queue where created_at < now() - interval '5 days';"
CONFIG="/srv/hive/current/dist/manager/config.json"
[ -f "$CONFIG" ] || ( echo "No config file present" ; exit 1 )
CONNECTION_STRING="postgres://$( jq -r .db.user < $CONFIG):\
$( jq -r .db.password < $CONFIG )@$( jq -r .db.host < $CONFIG ):$( jq -r .db.port < $CONFIG )/\
$( jq -r .db.database < $CONFIG )"

psql_run_cmd "$CONNECTION_STRING" "$DELETE_DONE_2D"
psql_run_cmd "$CONNECTION_STRING" "$DELETE_ALL_5D"
EOF
chmod 755 /root/db-scripts/purge-old-syncShops-rows.sh
( crontab -l ; echo '0 7 * * * /root/db-scripts/purge-old-syncShops-rows.sh >> /var/log/hive-db-purge.log' ) | crontab -

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
