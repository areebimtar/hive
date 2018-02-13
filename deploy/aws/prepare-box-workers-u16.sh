#!/bin/bash -xv
set -e

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# CONFIG
. ./install-hive.cfg &>/dev/null || { log "WARNING: config file 'install-hive.cfg' not found"; }

# REQUIRED VARS
PARAMS="CCI_TOKEN IP_MANAGER_DB_COUPLE_LIST WORKERS_PER_MANAGER AWS_ACCESS_KEY AWS_SECRET_KEY NODE_VERSION"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done


# NTP
install_ntp

# ADD HIVE USER/GROUP
add_hive_user


# INSTALL NODEJS
install_nodejs

# INSTALL CCI-PINGU
install_ccipingu
cat > /srv/hive/cci-pingu/config/hive-workers.conf << EOF
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
    "worker.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive-workers.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-workers.conf


# INSTALL JSON-MERGE TOOL
install_jsonmerge_tool


# SERVER SYSTEMD SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating Workers systemd scripts"
cat > /etc/systemd/system/hive-workers.service << EOF
[Unit]
Description=Hive workers
After=network.target

[Service]
RemainAfterExit=yes
ExecStart=/usr/local/bin/start-hive-workers-all.sh
ExecStop=/usr/local/bin/stop-hive-workers-all.sh

[Install]
WantedBy=multi-user.target

EOF
cat > /etc/systemd/system/hive-worker@.service << EOF
[Unit]
Description=Hive worker instance %i

[Service]
User=hive
Group=hive
WorkingDirectory=/srv/hive/current
ExecStart=/bin/bash -c 'exec /usr/bin/env -i NODE_ENV=production HIVE_CONFIG="/srv/hive/current/dist/worker/configs/%i.json" /usr/bin/node --expose_gc --trace_gc --trace_gc_verbose --trace_gc_nvp --trace_gc_object_stats --max_old_space_size=4096 ./dist/worker/server.js 1>>/var/log/hive-workers/worker-%i.log 2>&1'
Restart=always

EOF


# HELPERS
log "Installing helper functions"

cat > /usr/local/bin/start-hive-workers.sh << EOF
#!/bin/bash

systemctl start hive-workers

EOF

cat > /usr/local/bin/start-hive-workers-all.sh << 'EOF'
#!/bin/bash

for f in /srv/hive/current/dist/worker/configs/*; do
        conf=`basename $f .json`
        systemctl start hive-worker@$conf.service
done

EOF

cat > /usr/local/bin/stop-hive-workers.sh << EOF
#!/bin/bash

systemctl stop hive-workers

EOF

cat > /usr/local/bin/stop-hive-workers-all.sh << EOF
#!/bin/bash

systemctl stop 'hive-worker@*'

EOF

chmod 755 /usr/local/bin/start-hive-workers*.sh /usr/local/bin/stop-hive-workers*.sh

cd /usr/local/bin

cat > status << 'EOF'
#!/bin/bash

STATUS=`systemctl status $1 | awk '/^   Active:/ { print $2 }'`

[ $STATUS = 'active' ] && echo $1 start/running || echo $1 stopped

EOF

cat > start << 'EOF'
#!/bin/bash

systemctl `basename $0` $1

EOF

ln start stop
ln start restart
chmod +x status start stop restart
cd -


# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive-workers.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive-workers.sh' /etc/sudoers


# HIVE-WORKERS LOG FILES
log "Configuring Workers log files"
# CUSTOM LOGGING
mkdir /var/log/hive-workers
chown hive:hive /var/log/hive-workers
cat > /etc/logrotate.d/hive-workers << EOF
/var/log/hive-workers/*.log
{
  su hive hive
  compress
  delaycompress
  copytruncate
  missingok
  rotate 28
  daily
}
EOF


# CONFIG FILES PATCHES
log "Creating Workers configuration patch files"
cat > /srv/hive/patch-worker-config.json << EOF
{
  "db": {
    "port": 5432,
    "database": "hive",
    "user": "hive",
    "password": "DB_PASSWORD",
    "logQueries": true
  },
  "etsy": {
    "auth": {
      "consumerKey": "ETSY_KEY",
      "consumerSecret": "ETSY_SECRET"
    }
  },
  "logging": {
      "loggly": {
          "velaEnvironment": "ENVIRONMENT",
          "token": "LOGGLY_TOKEN"
      }
  },
  "rabbitmq": {
    "uri": "amqp://USER:PASSWORD@HOST/QUE_NAME"
  }
}
EOF
chown hive:hive /srv/hive/patch-worker-config.json
I=1
for IP_COUPLE in $IP_MANAGER_DB_COUPLE_LIST
do
cat > /srv/hive/patch-worker-config-for-m$I.json << EOF
{
  "db": {
    "host": "${IP_COUPLE#*:}"
  },
  "syncManager" : {
    "url": "http://${IP_COUPLE%:*}:8080"
  }
}
EOF
I=$(expr $I + 1)
done


# CONFIG GENERATOR
log "Creating Workers config generator"
cat > /srv/hive/generate-worker-configs.sh << EOF
#!/bin/bash
set -e

WORKERS_PER_MANAGER=$WORKERS_PER_MANAGER

mkdir current/dist/worker/configs
IDS=\`seq \$WORKERS_PER_MANAGER\`
for F in /srv/hive/patch-worker-config-for-*
do
  CFG=\${F##*-}
  CFG=\${CFG%.json}
  echo "Generating JSON config files for \$CFG."
  for ID in \$IDS
  do
    echo '{"workerId":"'\$CFG-\$ID'"}' |
    /usr/bin/node /srv/hive/json-merge.js \$F |
    /usr/bin/node /srv/hive/json-merge.js /srv/hive/patch-worker-config.json |
    /usr/bin/node /srv/hive/json-merge.js /srv/hive/current/dist/worker/config.json |
    cat - > /srv/hive/current/dist/worker/configs/\$CFG-\$ID.json
  done
done
EOF
chown hive:hive /srv/hive/generate-worker-configs.sh
chmod 755 /srv/hive/generate-worker-configs.sh

# CCI UPDATE SCRIPT (GETS NAME OF DIR WITH CCI ARTIFACTS)
log "Creating Workers update script"
cat > /srv/hive/.cci-update-hive-workers.sh << 'EOF'
#!/bin/bash
set -e

DIR=$1
cd "$DIR"
echo "Hive Workers Server: installation of $DIR started."
echo "+ unpacking artifacts"
tar xfz worker.tgz
cd ..
echo "+ stopping Hive Workers Server"
sudo /usr/local/bin/stop-hive-workers.sh || true
echo "+ linking new Hive Workers Server version"
rm -f current
ln -s "$DIR" current
echo "+ generating config files"
./generate-worker-configs.sh
echo "+ starting new Hive Workers Server"
sudo /usr/local/bin/start-hive-workers.sh
echo "Hive Workers Server: installation completed."
EOF
chown hive:hive /srv/hive/.cci-update-hive-workers.sh
chmod 755 /srv/hive/.cci-update-hive-workers.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e
set -o pipefail

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-workers.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-workers.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
else
  echo "usage: ./UPDATE.sh [build-number]"
  echo "if [build-number] is not specified, the latest build from CCI is used."
fi
EOF
chown hive:hive /srv/hive/UPDATE.sh
chmod 755 /srv/hive/UPDATE.sh


# INIT CLOUDWATCH
cloudwatch_init

# INIT WORKER MEMORY CLOUDWATCH
cloudwatch_worker_mem_mon_init

log "Hive workers server is set up, please fill in all variables in /srv/hive/patch-worker-config.json
and as user hive in /srv/hive/ run ./UPDATE.sh [build_num] to deploy and start"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
