#!/bin/bash
set -e

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# CONFIG
. ./install-hive.cfg &>/dev/null || { log "WARNING: config file 'install-hive.cfg' not found"; }

# REQUIRED VARS
PARAMS="CCI_TOKEN AS_DOMAIN LOGIN_DOMAIN LOGIN_URL PRIV_KEY PUB_KEY CERT PG_HIVE_PASSWORD ETSY_KEY ETSY_SECRET CCI_UPDATE"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# EXPORT VARS
export_vars

# FIX LOCALE
fix_locale || die "fixing locales"

# SET FIREWALL RULES (SSH/HTTP/HTTPS ONLY)
log "Setting the firewall rules"
ufw disable
ufw default deny
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 8000
ufw allow 15672 # rabbitmq management console
yes | ufw enable


# UPDATE apt-get
log "updating apt-get"
echo "deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -cs`-pgdg main" >> /etc/apt/sources.list.d/pgdg.list
echo "deb http://www.rabbitmq.com/debian/ testing main" >> /etc/apt/sources.list.d/pgdg.list
wget -q https://www.postgresql.org/media/keys/ACCC4CF8.asc -O - | apt-key add -
wget -q https://www.rabbitmq.com/rabbitmq-release-signing-key.asc -O - | apt-key add -
apt-get -qq update

#INSTALL AND STOP POSTGRES (we'll start it again later)
log "Installing PostgreSQL"
apt-get -qq install -y postgresql-9.5 postgresql-contrib-9.5
/etc/init.d/postgresql stop

rm -rf /var/lib/postgresql/9.5/main
su - -c "/usr/lib/postgresql/9.5/bin/initdb -D /var/lib/postgresql/9.5/main --encoding=UTF8 --locale=en_US.UTF-8 --username=postgres --data-checksums" postgres
su - -c "cp /etc/postgresql/9.5/main/pg_hba.conf /etc/postgresql/9.5/main/pg_hba.conf.orig" postgres
cat > /etc/postgresql/9.5/main/pg_hba.conf << EOF
# Database administrative login by Unix domain socket
local   all             postgres                                peer
local   hive            hive                                    peer
local   hive_auth       hive                                    peer
local   replication     postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    hive            hive            localhost               md5
host    hive_auth       hive            localhost               md5
EOF


# INSTALL RABBITMQ, ENABLE MANAGEMENT CONSOLE AND ADD A USER
apt-get -qq install -y rabbitmq-server=3.6.6-1
rabbitmq-plugins enable rabbitmq_management
rabbitmqctl add_user user1 pass1
rabbitmqctl set_user_tags user1 administrator

# INSTALL NTP
install_ntp || die "installing ntp"

# ADD HIVE USER
add_hive_user || die "add hive user"

# INSTALL NODEJS
install_nodejs || die "installing nodejs"

# CCI-PINGU
install_ccipingu
cat > /srv/hive/cci-pingu/config/hive.conf << EOF
{
  "organisation": "salsita",
  "interval": 60,
  "directory": "/srv/hive",
  "timeout": 45,
  "token": "$CCI_TOKEN",
  "project": "hive",
  "branch": "develop",
  "artifacts": [
    "auth.tgz",
    "web.tgz",
    "manager.tgz",
    "worker.tgz",
    "migrations-app.tgz",
    "migrations-auth.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive.sh",
  "hosting":"github"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive.conf


# CCI-PINGU UPSTART
log "Creating CCI-Pingu upstart script"
cat > /etc/init/cci-pingu.conf << EOF
description "CCI-Pingu update service"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/cci-pingu

EOF
if [ "$CCI_UPDATE" = "auto" ]
then
  echo "exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./cci-pingu.js --config=config/hive.conf 1>>/var/log/cci-pingu.log 2>&1'" >> /etc/init/cci-pingu.conf
else
  echo "# exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./cci-pingu.js --config=config/hive.conf 1>>/var/log/cci-pingu.log 2>&1'" >> /etc/init/cci-pingu.conf
fi


# INSTALL JSON-MERGE TOOL
install_jsonmerge_tool

# INSTALL CERTIFICATES
install_certs


# CREATE DB USER
log "Starting postgres and adding 'hive' user to postgres"
/etc/init.d/postgresql start
su - -c "createuser --no-createdb --login --no-createrole --no-superuser hive" postgres
su - -c "psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c \"alter user hive with password '$PG_HIVE_PASSWORD';\"" postgres


# CREATE APP DATABASE
log "Creating app db"
su - -c 'createdb hive' postgres
log "Setting up postgres_fdw"
su - -c "psql -v ON_ERROR_STOP=1 -U postgres -d hive -c \"CREATE EXTENSION postgres_fdw;\"" postgres
su - -c "psql -v ON_ERROR_STOP=1 -U postgres -d hive -c \"GRANT USAGE ON FOREIGN DATA WRAPPER postgres_fdw TO hive;\"" postgres
log "Allow hive user to create schemas"
su - -c "psql -v ON_ERROR_STOP=1 -U postgres -d hive -c \"GRANT CREATE ON DATABASE hive TO hive;\"" postgres


# CREATE AUTH DATABASE
log "Creating auth db"
su - -c 'createdb hive_auth' postgres

# SERVER UPSTART SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating Hive upstart scripts"
cat > /etc/init/hive-auth.conf << EOF
description "Hive Auth Server"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current/

exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./dist/auth/server.js 1>>/var/log/hive-auth.log 2>&1'
EOF
cat > /etc/init/hive-web.conf << EOF
description "Hive Web Server"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current/

exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./dist/web/server.js 1>>/var/log/hive-web.log 2>&1'
EOF
cat > /etc/init/hive-manager.conf << EOF
description "Hive Manager Service"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current/

exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./dist/manager/server.js 1>>/var/log/hive-manager.log 2>&1'
EOF
cat > /etc/init/hive-workers.conf << 'EOF'
description "Hive Workers"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

pre-start script
  for f in /srv/hive/current/dist/worker/configs/*
  do
    conf=`basename $f | sed -e 's/\.json$//'`
    start hive-worker id=$conf || true
  done
end script

post-stop script
  for inst in `initctl list | grep "^hive-worker " | awk '{print $2}' | tr -d ')' | tr -d '('`
  do
    stop hive-worker id=$inst || true
  done
end script
EOF
cat > /etc/init/hive-worker.conf << 'EOF'
description "Hive Worker Instance"

instance $id

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current

exec /bin/bash -c 'exec /usr/bin/env -i NODE_ENV=production HIVE_CONFIG="/srv/hive/current/dist/worker/configs/$id.json" /usr/bin/node ./dist/worker/server.js 1>>/var/log/hive-workers/worker-${id}.log 2>&1'
EOF


# HELPERS
log "Installing helper functions"
cat > /usr/local/bin/start-hive.sh << EOF
#!/bin/bash
/sbin/start hive-auth
/sbin/start hive-web
/sbin/start hive-manager
/sbin/start hive-workers
EOF
cat > /usr/local/bin/stop-hive.sh << EOF
#!/bin/bash
/sbin/stop hive-workers
/sbin/stop hive-manager
/sbin/stop hive-web
/sbin/stop hive-auth
EOF
cat > /usr/local/bin/reset-hive-auth-db.sh << EOF
#!/bin/bash
su - -c "dropdb hive_auth" postgres
su - -c "createdb -O hive hive_auth" postgres
EOF
cat > /usr/local/bin/reset-hive-db.sh << EOF
#!/bin/bash
su - -c "dropdb hive" postgres
su - -c "createdb -O hive hive" postgres
EOF
chmod 755 /usr/local/bin/start-hive.sh /usr/local/bin/stop-hive.sh /usr/local/bin/reset-hive-auth-db.sh /usr/local/bin/reset-hive-db.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/reset-hive-auth-db.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/reset-hive-db.sh' /etc/sudoers


# LOG FILES (HIVE AND CCI-PINGU)
log "Configuring log files (Hive and CCI-Pingu)"
for LOG_FILE in cci-pingu hive-auth hive-web hive-manager
do
  touch /var/log/$LOG_FILE.log
  chown hive:hive /var/log/$LOG_FILE.log
  cat > /etc/logrotate.d/$LOG_FILE << EOF
/var/log/$LOG_FILE.log
{
  compress
  delaycompress
  copytruncate
  missingok
  rotate 4
  size 100M
  weekly
}
EOF
done
mkdir /var/log/hive-workers
chown hive:hive /var/log/hive-workers
cat > /etc/logrotate.d/hive-workers << EOF
/var/log/hive-workers/*
{
  compress
  delaycompress
  copytruncate
  missingok
  rotate 4
  size 100M
  weekly
}
EOF


# CONFIG FILES PATCHES
log "Creating Hive configuration patch files"
cat > /srv/hive/patch-auth-config.json << EOF
{
  "cookiesDomain": "$AS_DOMAIN",
  "webUrl": "https://$AS_DOMAIN:8000",
  "httpPort": 80,
  "auth": {
    "scheme": "https",
    "host": "$LOGIN_DOMAIN",
    "port": 443
  },
  "db": {
    "host": "localhost",
    "port": 5432,
    "database": "hive_auth",
    "user": "hive",
    "password": "$PG_HIVE_PASSWORD",
    "logQueries": true
  },
  "crypto": {
    "privateKey": "$PRIV_KEY",
    "publicKey": "$PUB_KEY",
    "certificate": "$CERT"
  }
}
EOF
chown hive:hive /srv/hive/patch-auth-config.json
cat > /srv/hive/patch-web-config.json << EOF
{
  "crypto": {
    "privateKey": "$PRIV_KEY",
    "publicKey": "$PUB_KEY",
    "certificate": "$CERT"
  },
  "loginPage": "$LOGIN_URL",
  "db": {
    "host": "localhost",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "$PG_HIVE_PASSWORD",
    "logQueries": true
  },
  "etsy": {
    "auth": {
      "consumerKey": "$ETSY_KEY",
      "consumerSecret": "$ETSY_SECRET"
    }
  },
  "serverScheme": "https",
  "serverDomain": "$AS_DOMAIN",
  "serverPort": 8000,
  "syncManager" : {
    "url": "http://localhost:8080"
  }
}
EOF
chown hive:hive /srv/hive/patch-web-config.json
cat > /srv/hive/patch-manager-config.json << EOF
{
  "db": {
    "host": "localhost",
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
cat > /srv/hive/patch-worker-config.json << EOF
{
  "db": {
    "host": "localhost",
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "$PG_HIVE_PASSWORD",
    "logQueries": true
  },
  "etsy": {
    "auth": {
      "consumerKey": "$ETSY_KEY",
      "consumerSecret": "$ETSY_SECRET"
    }
  },
  "syncManager" : {
    "url": "http://localhost:8080"
  }
}
EOF
chown hive:hive /srv/hive/patch-worker-config.json


# CCI UPDATE SCRIPT (GETS NAME OF DIR WITH CCI ARTIFACTS)
log "Creating Hive update script"
cat > /srv/hive/.cci-update-hive.sh << EOF
#!/bin/bash
set -e

DIR="\$1"
cd "\$DIR"
echo "Hive: installation of \$DIR started."
echo "+ unpacking artifacts"
tar xfz auth.tgz
tar xfz web.tgz
tar xfz manager.tgz
tar xfz worker.tgz
tar xfz migrations-app.tgz
tar xfz migrations-auth.tgz
echo "+ stopping Hive"
sudo /usr/local/bin/stop-hive.sh || true

echo "+ migrating AUTH DB (only if needed)"
COUNT_DB=\$(PGPASSWORD="${PG_HIVE_PASSWORD}" psql -h localhost -U hive -d hive_auth -t -c 'select count(*) from pgmigrations;' || echo "ERROR")
if [ \$COUNT_DB = "ERROR" ]; then COUNT_DB=0; fi
echo "  - migrations in DB: \$COUNT_DB"
COUNT_DISK=\$(ls -1 migrations-auth/*.js | wc -l)
echo "  - migrations in build: \$COUNT_DISK"
export DATABASE_URL="postgresql://hive:${PG_HIVE_PASSWORD}@localhost/hive_auth"
if [ \$COUNT_DISK -ge \$COUNT_DB ]
then
  echo "  - performing UP migration"
  ./node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ./migrations-auth -v up
else
  STEPS=\$(expr \$COUNT_DB \- \$COUNT_DISK)
  echo "  - performing DOWN(\${STEPS}) migration"
  ../current/node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ../current/migrations-auth -v down \$STEPS
fi

echo "+ migrating APP DB (only if needed)"
COUNT_DB=\$(PGPASSWORD="${PG_HIVE_PASSWORD}" psql -h localhost  -U hive -d hive -t -c 'select count(*) from pgmigrations;' || echo "ERROR")
if [ \$COUNT_DB = "ERROR" ]; then COUNT_DB=0; fi
echo "  - migrations in DB: \$COUNT_DB"
COUNT_DISK=\$(ls -1 migrations-app/*.js | wc -l)
echo "  - migrations in build: \$COUNT_DISK"
export DATABASE_URL="postgresql://hive:${PG_HIVE_PASSWORD}@localhost/hive"
if [ \$COUNT_DISK -ge \$COUNT_DB ]
then
  echo "  - performing UP migration"
  ./node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ./migrations-app -v up
else
  STEPS=\$(expr \$COUNT_DB \- \$COUNT_DISK)
  echo "  - performing DOWN(\${STEPS}) migration"
  ../current/node_modules/node-pg-migrate/bin/pg-migrate --check-order -m ../current/migrations-app -v down \$STEPS
fi
echo "+ removing old records from task_queue table"
PGPASSWORD="$PG_HIVE_PASSWORD" psql -h localhost -U hive -d hive -c 'select trim_queue(2);' -t || true

cd ..
echo "+ linking new Hive version"
rm -f current
ln -s "\$DIR" current
echo "+ updating config files"
cd current/dist/auth
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-auth-config.json > config.json
cd -
cd current/dist/web
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-web-config.json > config.json
cd -
cd current/dist/manager
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-manager-config.json > config.json
cd -
echo "+ creating config files for workers"
cd current/dist/worker
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-worker-config.json > config.json
mkdir configs
for CONFIG in 1 2
do
  /usr/bin/node /srv/hive/json-merge.js config.json < /srv/hive/patch-worker-config.json > configs/\$CONFIG.json
done
cd -
echo "+ starting new Hive"
sudo /usr/local/bin/start-hive.sh
echo "Hive: installation completed."
EOF
chown hive:hive /srv/hive/.cci-update-hive.sh
chmod 755 /srv/hive/.cci-update-hive.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e
set -o pipefail

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
else
  echo "usage: ./UPDATE.sh [build-number]"
  echo "if [build-number] is not specified, the latest build from CCI is used."
fi
EOF
chown hive:hive /srv/hive/UPDATE.sh
chmod 755 /srv/hive/UPDATE.sh


# INITIATE THE FIRST INSTALL (auto / manual)
if [ "$CCI_UPDATE" = "auto" ]
then
  log "Starting CCI-Pingu to install Hive, please check /var/log/cci-pingu.log for details"
else
  log "Installing Hive (manual mode)"
  su - -c "/srv/hive/UPDATE.sh >> /var/log/cci-pingu.log" hive
fi


# SUCCESS!
RESULT_MESSAGE='SUCCESS'
