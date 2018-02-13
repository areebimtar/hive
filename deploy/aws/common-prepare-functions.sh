#!/bin/bash

# VARIABLES NEEDED IN update.cfg WITH FUNCTION WHICH REQUIRES THEM
# NODE_VERSION for install_nodejs()
# AWS_ACCESS_KEY and AWS_SECRET_KEY for cloudwatch_init()

# FANCY LOG MSGS
c0="\033[0m"; c1="\033[0;31m"; c2="\033[0;36m"; [ -t 1 ] || { c0=''; c1=''; c2=''; }
die() { printf "${c1}Error: %s$c0\n" "$*"; exit 1; }
log() { printf "${c2}** %s$c0\n" "$*"; }

# EXIT MESSAGE
export RESULT_MESSAGE="Error: `basename $0` failed"
on_exit() { printf "\n$c2%s$c0\n" "$RESULT_MESSAGE"; }
trap on_exit 0

# SMART ADDING FILE LINES (ADD IF NOT THERE YET)
add_line() {
  line=$1 file=$2
  grep -F -- "$line" "$file" &> /dev/null || printf "%s\n" "$line" >> "$file"
}

apt-get update -qq

# FIX LOCALE
fix_locale() {
  log "Fixing locale"
  add_line 'export LANGUAGE="en"' /etc/profile
  add_line 'export LANG="C"' /etc/profile
  add_line 'export LC_MESSAGES="C"' /etc/profile
  add_line 'export LC_ALL="en_US.UTF-8"' /etc/profile
}

# EXPORT VARIABLES
export_vars () {
  export LANGUAGE="en"
  export LANG="C"
  export LC_MESSAGES="C"
  export LC_ALL="en_US.UTF-8"
}

# INSTALL NPT
install_ntp() {
  log "Installing NTP"
  apt-get -qq install -y ntp
}

# ADD HIVE USER
add_hive_user() {
  log "Adding system user 'hive'"
  groupadd -f hive
  grep ^hive: /etc/passwd &>/dev/null || useradd --home /srv/hive -g hive --create-home -s /bin/bash hive
}

# INSTALL NODEJS
# IF NVM AND NODEJS GET INTALLED ON UBUNTU USER, THERE IS NO HASSLE WITH PATH AND LOADING STUFF FOR NEXT INSTALL, SO
# NEW NODE IS INSTALLED AND THE COPIED TO THE PROPER PLACE, GIVEN PROPER RIGHTS AND SYMLINKED. THEREFOR ALL IMPORTANT
# USERS (hive AND root) CAN RUN IT VIA /usr/bin/node AND IT'S ALWAYS THE SELECTED VERSION
install_nodejs() {
  if [[ $NODE_VERSION = "" ]] ; then
    die "Provide NODE_VERSION variable"
  fi
  log "Installing Node.js"
  apt-get -qq install -y build-essential libssl-dev
  su - -c 'curl https://raw.githubusercontent.com/creationix/nvm/v0.31.7/install.sh | bash && source ~/.nvm/nvm.sh && \
  nvm install '"$NODE_VERSION"'' ubuntu
  cp -r /home/ubuntu/.nvm /srv/hive/
  chown -R hive:hive /srv/hive/.nvm
  ln -s /srv/hive/.nvm/versions/node/"$NODE_VERSION"/bin/node /usr/bin/node
  setcap 'cap_net_bind_service=+ep' /srv/hive/.nvm/versions/node/"$NODE_VERSION"/bin/node # node can bind ports < 1024
}

# INSTALL CCI-PINGU
install_ccipingu() {
  log "Installing and configuring CCI-Pingu"
  su - -c "mkdir cci-pingu" hive
  cp cci-pingu.tgz /srv/hive/
  chown hive:hive /srv/hive/cci-pingu.tgz
  su - -c "tar xfz cci-pingu.tgz -C cci-pingu" hive
  rm /srv/hive/cci-pingu.tgz
}

# SET UP CLOUDWATCH LOGS
cloudwatch_init() {
  if [[ $AWS_ACCESS_KEY = "" || $AWS_SECRET_KEY = "" ]] ; then
    die "Provide 'AWS_ACCESS_KEY' and 'AWS_SECRET_KEY' variables"
  fi
  log "Initiating CloudWatch logging"
  
  # INSTALL UNZIP AND PERL
  log "Installing unzip and pearl"
  apt-get -qq install -y unzip libwww-perl libdatetime-perl
  
  # DOWNLOAD CLOUDWATCH LOGGING TOOL
  log "Downloading CloudWatch logging tool"
  curl http://aws-cloudwatch.s3.amazonaws.com/downloads/CloudWatchMonitoringScripts-1.2.1.zip -O || die "Unable to download logging tool"
  unzip CloudWatchMonitoringScripts-1.2.1.zip &>/dev/null || die "Couldn't unzip logging tool"
  mv aws-scripts-mon /root/
  rm CloudWatchMonitoringScripts-1.2.1.zip
  
  # CREATE CREDENTIALS FILE
  log "Creating credentials file"
  echo "AWSAccessKeyId=$AWS_ACCESS_KEY" > /root/aws-scripts-mon/awscreds.template
  echo "AWSSecretKey=$AWS_SECRET_KEY" >> /root/aws-scripts-mon/awscreds.template
  
  # CREATE CRON JOB
  log "Creating cron job"
  echo '*/5 * * * * ~/aws-scripts-mon/mon-put-instance-data.pl --mem-util --mem-used --mem-avail --swap-util --swap-used --disk-path=/ --disk-space-util --disk-space-used --disk-space-avail --memory-units=megabytes --disk-space-units=gigabytes  --aws-credential-file=/root/aws-scripts-mon/awscreds.template --from-cron' > /tmp/aws_crontab
  crontab /tmp/aws_crontab
  rm /tmp/aws_crontab
}

# SET UP CLOUDWATCH WORKER PROCESS MEMORY MONITORING
cloudwatch_worker_mem_mon_init() {
  if [[ $AWS_ACCESS_KEY = "" || $AWS_SECRET_KEY = "" ]] ; then
    die "Provide 'AWS_ACCESS_KEY' and 'AWS_SECRET_KEY' variables"
  fi
  log "Initiating CloudWatch worker process memory monitoring"

  # INSTALL PIP AND AWS CLI
  log "Installing pip and awscli"
  apt-get -qq install -y python-pip
  pip install awscli

  # CREATE AWS CONFIG AND CREDENTIALS FILES
  log "Creating AWS config and credentials files"
  mkdir /root/.aws
  echo '[default]' | tee /root/.aws/config > /root/.aws/credentials
  echo 'region = us-west-1' >> /root/.aws/config
  echo "aws_access_key_id = $AWS_ACCESS_KEY" >> /root/.aws/credentials
  echo "aws_secret_access_key = $AWS_SECRET_KEY" >> /root/.aws/credentials

  # PLACE SCRIPT IN ROOT HOME DIRECTORY 
  log "Placing script in root's home directory"
  mkdir /root/aws-scripts-mon-custom/
  cp mon_worker_mem.sh /root/aws-scripts-mon-custom/
  chmod +x /root/aws-scripts-mon-custom/mon_worker_mem.sh

  # CREATE CRONJOB
  log "Creating cronjob"
  (crontab -l; echo '* * * * * ~/aws-scripts-mon-custom/mon_worker_mem.sh') | crontab -
}


# INSTALL JSON-MERGE TOOL
install_jsonmerge_tool() {
  log "Installing json-merge tool"
  cp json-merge.js /srv/hive/
  chown hive:hive /srv/hive/json-merge.js
}

# IP VALIDATION FUNC
valid_ip()
{
    local  ip=$1
    local  stat=1

    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        OIFS=$IFS
        IFS='.'
        ip=($ip)
        IFS=$OIFS
        [[ ${ip[0]} -le 255 && ${ip[1]} -le 255 \
            && ${ip[2]} -le 255 && ${ip[3]} -le 255 ]]
        stat=$?
    fi
    return $stat
}

install_certs() {
  log "Unpacking SSL certificates"
  tar xzf cert.tgz -C /srv/hive/
  chown -R hive:hive /srv/hive/cert
}

initiate_logging() {
  if [[ "$1" = "" ]] ; then
    die 'Missing log file name'
  fi
  mkdir /var/log/hive
  touch /var/log/hive/"$1".log
  chown -R hive:hive /var/log/hive
  cat > /etc/logrotate.d/"$1" << EOF
/var/log/hive/${1}.log
{
su hive hive
daily
compress
delaycompress
copytruncate
missingok
rotate 28
}
EOF
}
