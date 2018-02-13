#!/bin/bash
set -e

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# CONFIG
. ./install-hive.cfg &>/dev/null || { log "WARNING: config file 'install-hive.cfg' not found"; }

# REQUIRED VARS
PARAMS="CCI_TOKEN PRIV_KEY PUB_KEY CERT AWS_ACCESS_KEY AWS_SECRET_KEY NODE_VERSION"
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
cat > /srv/hive/cci-pingu/config/hive-web.conf << EOF
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
    "web.tgz"
  ],
  "script": "/srv/hive/.cci-update-hive-web.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-web.conf


# INSTALL JSON-MERGE TOOL
install_jsonmerge_tool


# INSTALL CERTIFICATES
install_certs


# SERVER UPSTART SCRIPTS AND RELATED HELPERS FOR HIVE USER
log "Creating Web upstart scripts"
cat > /etc/init/hive-web.conf << EOF
description "Hive Web Server"

start on (local-filesystems and net-device-up IFACE!=lo)
stop on stopping network-services

respawn
respawn limit 10 5

setuid hive
setgid hive
chdir /srv/hive/current/

exec /bin/sh -c 'exec /usr/bin/env -i NODE_ENV=production /usr/bin/node ./dist/web/server.js 1>>/var/log/hive/hive-web.log 2>&1'
EOF

# HELPERS
log "Installing helper functions"
cat > /usr/local/bin/start-hive-web.sh << EOF
#!/bin/bash
/sbin/start hive-web
EOF
cat > /usr/local/bin/stop-hive-web.sh << EOF
#!/bin/bash
/sbin/stop hive-web
EOF
chmod 755 /usr/local/bin/start-hive-web.sh /usr/local/bin/stop-hive-web.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/start-hive-web.sh' /etc/sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/stop-hive-web.sh' /etc/sudoers


# HIVE-WEB LOG FILE
log "Configuring Web log files"
initiate_logging "hive-web"

log "Creating web configuration patch files"

# CONFIG FILES PATCHES
cat > /srv/hive/patch-web-config.json << EOF
{
    "cookiesDomain": "COOKIES_DOMAIN",
    "crypto": {
        "privateKey": "PRIV_KEY_PATH",
        "publicKey": "PUB_KEY_PATH",
        "certificate": "CERT_PATH"
    },
    "loginPage": "LOGIN_PAGE",
    "logoutPage": "LOGIN_PAGE/logout",
    "customSignupPage": "CUSTOM_SIGNUP_PAGE",
    "db": {
        "host": "DB_HOST_URL",
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
    "intercom": {
        "secureModeSecretKey": "INTERCOM_SECRET_KEY"
    },
    "serverScheme": "https",
    "serverDomain": "WEBSERVER_DOMAIN_NAME",
    "serverPort": 443,
    "syncManager": {
        "url": "http://MANAGER_IP:8080"
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
    },
    "rabbitmq": {
        "uri": "amqp://USER:PASSWORD@HOST/QUE_NAME"
    }
}
EOF
chown hive:hive /srv/hive/patch-web-config.json

# CCI UPDATE SCRIPT (GETS NAME OF DIR WITH CCI ARTIFACTS)
log "Creating web update script"
cat > /srv/hive/.cci-update-hive-web.sh << 'EOF'
#!/bin/bash
set -e

DIR=$1
cd "$DIR"
echo "Hive Web Server: installation of $DIR started."
echo "+ unpacking artifacts"
tar xfz web.tgz
cd ..
echo "+ stopping Hive Web Server"
sudo /usr/local/bin/stop-hive-web.sh || true
echo "+ linking new Hive Web Server version"
rm -f current
ln -s "$DIR" current
echo "+ updating config files"
cd current/dist/web
mv config.json config.json.orig
/usr/bin/node /srv/hive/json-merge.js config.json.orig < /srv/hive/patch-web-config.json > config.json
cd -
echo "+ starting new Hive Web Server"
sudo /usr/local/bin/start-hive-web.sh
echo "Hive Web Server: installation completed."
EOF
chown hive:hive /srv/hive/.cci-update-hive-web.sh
chmod 755 /srv/hive/.cci-update-hive-web.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e
set -o pipefail

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-web.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-web.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
else
  echo "usage: ./UPDATE.sh [build-number]"
  echo "if [build-number] is not specified, the latest build from CCI is used."
fi
EOF
chown hive:hive /srv/hive/UPDATE.sh
chmod 755 /srv/hive/UPDATE.sh

# INIT CLOUDWATCH
cloudwatch_init

log "Hive webserver is set up, please fill in all variables in /srv/hive/patch-web-config.json
and as user hive in /srv/hive/ run ./UPDATE.sh [build_num] to deploy and start"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
