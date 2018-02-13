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
PARAMS="DB_IP_ADDR PG_HIVE_PASSWORD CCI_TOKEN ETSY_KEY ETSY_SECRET AS_DOMAIN LOGIN_URL PRIV_KEY PUB_KEY CERT"
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


# SET FIREWALL RULES (SSH/HTTPS/8080 ONLY)
log "Setting the firewall rules"
ufw disable
ufw default deny
ufw allow ssh
ufw allow https
ufw allow 8080/tcp
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
su - -c "mkdir cci-pingu" hive
cp cci-pingu.tgz /srv/hive/
chown hive:hive /srv/hive/cci-pingu.tgz
su - -c "tar xfz cci-pingu.tgz -C cci-pingu" hive
rm /srv/hive/cci-pingu.tgz
cat > /srv/hive/cci-pingu/config/hive-as.conf << EOF
{
  "organisation": "salsita",
  "interval": 60,
  "directory": "/srv/hive",
  "timeout": 45,
  "token": "$CCI_TOKEN",
  "project": "hive",
  "branch": "develop",
  "artifacts": [
    "web.tgz",
    "manager.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive-as.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-as.conf


# INSTALL JSON-MERGE TOOL
log "Installing json-merge tool"
cp json-merge.js /srv/hive/
chown hive:hive /srv/hive/json-merge.js


# INSTALL CERTIFICATES
log "Unpacking SSL certificates"
cp cert.tgz /srv/hive/
chown hive:hive /srv/hive/cert.tgz
su - -c "tar xfz cert.tgz" hive
rm /srv/hive/cert.tgz


# SERVER UPSTART SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating AS upstart scripts"
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

# HELPERS
log "Installing helper functions"
cat > /usr/local/bin/start-hive-as.sh << EOF
#!/bin/bash
/sbin/start hive-web
/sbin/start hive-manager
EOF
cat > /usr/local/bin/stop-hive-as.sh << EOF
#!/bin/bash
/sbin/stop hive-manager
/sbin/stop hive-web
EOF
chmod 755 /usr/local/bin/start-hive-as.sh /usr/local/bin/stop-hive-as.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive-as.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive-as.sh' /etc/sudoers


log "Configuring AS log files"

# HIVE-WEB LOG FILE
touch /var/log/hive-web.log
chown hive:hive /var/log/hive-web.log
cat > /etc/logrotate.d/hive-web << EOF
/var/log/hive-web.log
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


# HIVE-MANAGER LOG FILE
touch /var/log/hive-manager.log
chown hive:hive /var/log/hive-manager.log
cat > /etc/logrotate.d/hive-manager << EOF
/var/log/hive-manager.log
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


log "Creating AS configuration patch files"

# CONFIG FILES PATCHES
cat > /srv/hive/patch-web-config.json << EOF
{
  "crypto": {
    "privateKey": "$PRIV_KEY",
    "publicKey": "$PUB_KEY",
    "certificate": "$CERT"
  },
  "loginPage": "$LOGIN_URL",
  "db": {
    "host": "$DB_IP_ADDR",
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
  "serverPort": 443,
  "syncManager" : {
    "url": "http://localhost:8080"
  }
}
EOF
chown hive:hive /srv/hive/patch-web-config.json
cat > /srv/hive/patch-manager-config.json << EOF
{
  "db": {
    "host": "$DB_IP_ADDR",
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
log "Creating AS update script"
cat > /srv/hive/.cci-update-hive-as.sh << 'EOF'
#!/bin/bash
set -e

DIR=$1
cd "$DIR"
echo "Hive Application Server: installation of $DIR started."
echo "+ unpacking artifacts"
tar xfz web.tgz
tar xfz manager.tgz
cd ..
echo "+ stopping Hive Application Server"
sudo /usr/local/bin/stop-hive-as.sh || true
echo "+ linking new Hive Application Server version"
rm -f current
ln -s "$DIR" current
echo "+ updating config files"
cd current/dist/web
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-web-config.json > config.json
cd -
cd current/dist/manager
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-manager-config.json > config.json
cd -
echo "+ starting new Hive Application Server"
sudo /usr/local/bin/start-hive-as.sh
echo "Hive Application Server: installation completed."
EOF
chown hive:hive /srv/hive/.cci-update-hive-as.sh
chmod 755 /srv/hive/.cci-update-hive-as.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-as.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-as.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
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
