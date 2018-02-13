#!/bin/bash
set -e


# FANCY LOG MSGS
c0="\033[0m"; c1="\033[0;31m"; c2="\033[0;36m"; [ -t 1 ] || { c0=''; c1=''; c2=''; }
die() { printf "${c1}Error: %s$c0\n" "$*"; exit 1; }
log() { printf "${c2}** %s$c0\n" "$*"; }


# CONFIG
. ./install-hive.cfg &>/dev/null || { log "WARNING: config file 'install-hive.cfg' not found"; }


# EXIT MESSAGE
RESULT_MESSAGE="Error: `basename $0` failed"
on_exit() { printf "\n$c2%s$c0\n" "$RESULT_MESSAGE"; }
trap on_exit 0


# REQUIRED VARS
PARAMS="CCI_TOKEN PG_HIVE_PASSWORD ETSY_KEY ETSY_SECRET IP_MANAGER_DB_COUPLE_LIST WORKERS_PER_MANAGER"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done


# SMART ADDING FILE LINES (ADD IF NOT THERE YET)
add_line() {
  line=$1 file=$2
  grep -F -- "$line" "$file" &> /dev/null || printf "%s\n" "$line" >> "$file"
}


# FIX LOCALE
log "Fixing locale"
add_line 'export LANGUAGE="en"' /etc/profile
add_line 'export LANG="C"' /etc/profile
add_line 'export LC_MESSAGES="C"' /etc/profile
add_line 'export LC_ALL="en_US.UTF-8"' /etc/profile

export LANGUAGE="en"
export LANG="C"
export LC_MESSAGES="C"
export LC_ALL="en_US.UTF-8"


# SET FIREWALL RULES (SSH ONLY)
log "Setting the firewall rules"
ufw disable
ufw default deny
ufw allow ssh
yes | ufw enable


# NTP
log "Installing NTP"
apt-get -qq install -y ntp


# ADD HIVE USER/GROUP
log "Adding system user 'hive'"
groupadd -f hive
grep ^hive: /etc/passwd &>/dev/null || useradd --home /srv/hive -g hive --create-home -s /bin/bash hive


# INSTALL NODEJS
log "Installing Node.js"
out=`curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash - 2>&1` || { printf "%s\n" "$out"; exit 1; }
apt-get -qq install -y nodejs
setcap cap_net_bind_service=+ep $(readlink -f `which node`) # node can bind ports < 1024


# INSTALL CCI-PINGU
log "Installing and configuring CCI-Pingu"
su - -c "mkdir -p cci-pingu" hive
cp cci-pingu.tgz /srv/hive/
chown hive:hive /srv/hive/cci-pingu.tgz
su - -c "tar xfz cci-pingu.tgz -C cci-pingu" hive
rm /srv/hive/cci-pingu.tgz
cat > /srv/hive/cci-pingu/config/hive-workers.conf << EOF
{
  "organisation": "salsita",
  "interval": 60,
  "directory": "/srv/hive",
  "timeout": 45,
  "token": "$CCI_TOKEN",
  "project": "hive",
  "branch": "develop",
  "artifacts": [
    "worker.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive-workers.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-workers.conf


# INSTALL JSON-MERGE TOOL
log "Installing json-merge tool"
cp json-merge.js /srv/hive/
chown hive:hive /srv/hive/json-merge.js


# SERVER UPSTART SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating Workers upstart scripts"
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
cat > /usr/local/bin/start-hive-workers.sh << EOF
#!/bin/bash
/sbin/start hive-workers
EOF
cat > /usr/local/bin/stop-hive-workers.sh << EOF
#!/bin/bash
/sbin/stop hive-workers
EOF
chmod 755 /usr/local/bin/start-hive-workers.sh /usr/local/bin/stop-hive-workers.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive-workers.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive-workers.sh' /etc/sudoers


# HIVE-WORKERS LOG FILES
log "Configuring Workers log files"
mkdir -p /var/log/hive-workers
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
log "Creating Workers configuration patch files"
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
    cat \$F |
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


# INITIATE THE FIRST INSTALL
log "Installing Hive"
su - -c "/srv/hive/UPDATE.sh" hive


# SUCCESS!
RESULT_MESSAGE='SUCCESS'
