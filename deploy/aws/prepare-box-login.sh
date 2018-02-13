#!/bin/bash
set -e

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# CONFIG
. ./install-hive.cfg &>/dev/null || { log "WARNING: config file 'install-hive.cfg' not found"; }


# REQUIRED VARS
PARAMS="PG_HIVE_PASSWORD PG_HOST CCI_TOKEN PRIV_KEY PUB_KEY CERT AWS_ACCESS_KEY AWS_SECRET_KEY NODE_VERSION"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# NTP
install_ntp

# HIVE USER
add_hive_user

# PSQL client
log "Installing PSQL client"
echo "deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main" > /etc/apt/sources.list.d/pgdg.list
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get -qq update
apt-get -qq install -y postgresql-client-common
apt-get -qq install -y postgresql-client-9.4


#CREATE DATABASE
log "Creating login db"
printf "create database hive_auth;\n" | PGPASSWORD="$PG_HIVE_PASSWORD" psql -h "$PG_HOST" -U hive -d postgres

# INSTALL NODEJS
install_nodejs

# INSTALL CCI-PINGU
install_ccipingu
cat > /srv/hive/cci-pingu/config/hive-auth.conf << EOF
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
    "auth.tgz",
    "migrations-auth.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive-auth.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-auth.conf


# INSTALL JSON-MERGE TOOL
install_jsonmerge_tool

# INSTALL CERTIFICATES
install_certs


# SERVER UPSTART SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating Auth Server upstart script"
cat > /etc/init/hive-auth.conf << EOF
description "Hive Auth Server"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current/

exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./dist/auth/server.js 1>>/var/log/hive/hive-auth.log 2>&1'
EOF


# HELPERS
log "Installing helper functions"
cat > /usr/local/bin/start-hive-auth.sh << EOF
#!/bin/bash
/sbin/start hive-auth
EOF
cat > /usr/local/bin/stop-hive-auth.sh << EOF
#!/bin/bash
/sbin/stop hive-auth
EOF
chmod 755 /usr/local/bin/start-hive-auth.sh /usr/local/bin/stop-hive-auth.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive-auth.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive-auth.sh' /etc/sudoers


# HIVE-AUTH LOG FILE
log "Configuring Auth Server log file"
initiate_logging "hive-auth"

# CONFIG FILES PATCHES
log "Creating Auth Server configuration patch file"
cat > /srv/hive/patch-auth-config.json << EOF
{
    "cookiesDomain": "COOKIES_DOMAIN",
    "webUrl": "https://WEBSERVER_URL",
    "httpPort": 80,
    "auth": {
        "scheme": "https",
        "host": "LOGIN_URL",
        "port": 443
    },
    "db": {
        "host": "$PG_HOST",
        "port": 5432,
        "database": "hive_auth",
        "user": "hive",
        "password": "$PG_HIVE_PASSWORD",
        "logQueries": true
    },
    "crypto": {
        "privateKey": "PRIV_KEY_PATH",
        "publicKey": "PUB_KEY_PATH",
        "certificate": "CERT_PATH"
    },
    "mandrill": {
        "apikey": "MANDIR_API_KEY"
    },
    "logging": {
        "loggly": {
            "velaEnvironment": "ENVIRONMENT",
            "token": "LOGGLY_TOKEN"
        }
    },
   "frontendVars": {
        "welcomeUrl": "WELCOME_URL",
        "mixpanelToken": "MIXPANEL_TOKEN",
        "intercomAppId": "INTERCOM_APP_ID"
    }
}
EOF
chown hive:hive /srv/hive/patch-auth-config.json


# CCI UPDATE SCRIPT (GETS NAME OF DIR WITH CCI ARTIFACTS)
log "Creating Auth Server update script"
cat > /srv/hive/.cci-update-hive-auth.sh << EOF
#!/bin/bash
set -e

DB_PWD="$PG_HIVE_PASSWORD"
DB_HOST="$PG_HOST"

DIR="\$1"
cd "\$DIR"
echo "Hive Auth Server: installation of \$DIR started."
echo "+ unpacking artifacts"
tar xfz auth.tgz
tar xfz migrations-auth.tgz
echo "+ stopping Hive Auth Server"
sudo /usr/local/bin/stop-hive-auth.sh || true
echo "+ migrating AUTH DB (only if needed)"
COUNT_DB=\`PGPASSWORD="\${DB_PWD}" psql -h "\$DB_HOST" -U hive -d hive_auth -t -c 'select count(*) from pgmigrations;' || echo "ERROR"\`
if [ \$COUNT_DB = "ERROR" ]; then COUNT_DB=0; fi
echo "  - migrations in DB: \$COUNT_DB"
COUNT_DISK=\`ls -1 migrations-auth/*.js | wc -l\`
echo "  - migrations in build: \$COUNT_DISK"
export DATABASE_URL="postgresql://hive:\${DB_PWD}@\${DB_HOST}/hive_auth"
if [ \$COUNT_DISK -ge \$COUNT_DB ]
then
  echo "  - performing UP migration"
  ./node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ./migrations-auth -v up
else
  STEPS=\`expr \$COUNT_DB \- \$COUNT_DISK\`
  echo "  - performing DOWN(\${STEPS}) migration"
  ../current/node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ../current/migrations-auth -v down \$STEPS
fi
cd ..
echo "+ linking new Hive Auth Server version"
rm -f current
ln -s "\$DIR" current
echo "+ updating config file"
cd current/dist/auth
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-auth-config.json > config.json
cd -
echo "+ starting new Hive Auth Server"
sudo /usr/local/bin/start-hive-auth.sh
echo "Hive Auth Server: installation completed."
EOF
chown hive:hive /srv/hive/.cci-update-hive-auth.sh
chmod 755 /srv/hive/.cci-update-hive-auth.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e
set -o pipefail

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-auth.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-auth.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
else
  echo "usage: ./UPDATE.sh [build-number]"
  echo "if [build-number] is not specified, the latest build from CCI is used."
fi
EOF
chown hive:hive /srv/hive/UPDATE.sh
chmod 755 /srv/hive/UPDATE.sh


# INIT CLOUDWATCH
cloudwatch_init

log "Hive login server is set up, please fill in all variables in /srv/hive/patch-auth-config.json
and as user hive in /srv/hive/ run ./UPDATE.sh [build_num] to deploy and start"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
