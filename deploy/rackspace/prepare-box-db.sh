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
PARAMS="PRIVATE_IP_ADDR PG_HIVE_PASSWORD CCI_TOKEN STORAGE_DEV"
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


# SET FIREWALL RULES (SSH/PG ONLY)
log "Setting the firewall rules"
ufw disable
ufw default deny
ufw allow ssh
ufw allow 5432/tcp
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


# INSTALL POSTGRESQL
log "Installing PostgreSQL"
echo "deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main" > /etc/apt/sources.list.d/pgdg.list
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get -qq update
apt-get -qq install -y postgresql-9.4
/etc/init.d/postgresql stop


# DB CONFIGURATION
log "Configuring PostgreSQL"
rm -rf /var/lib/postgresql/9.4/main
su - -c "/usr/lib/postgresql/9.4/bin/initdb -D /var/lib/postgresql/9.4/main --encoding=UTF8 --locale=en_US.UTF-8 --username=postgres --data-checksums" postgres
su - -c "cp /etc/postgresql/9.4/main/pg_hba.conf /etc/postgresql/9.4/main/pg_hba.conf.orig" postgres
cat > /etc/postgresql/9.4/main/pg_hba.conf << EOF
# Database administrative login by Unix domain socket
local   all             postgres                                peer
local   hive            hive                                    peer
local   replication     postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    hive            hive            10.0.0.0/8              md5
EOF
su - -c "cp /etc/postgresql/9.4/main/postgresql.conf /etc/postgresql/9.4/main/postgresql.conf.orig" postgres
cat > /etc/postgresql/9.4/main/postgresql.conf << EOF
# Paths
data_directory = '/var/lib/postgresql/9.4/main'
hba_file = '/etc/postgresql/9.4/main/pg_hba.conf'
ident_file = '/etc/postgresql/9.4/main/pg_ident.conf'
external_pid_file = '/var/run/postgresql/9.4-main.pid'
unix_socket_directories = '/var/run/postgresql'
stats_temp_directory = '/var/run/postgresql/9.4-main.pg_stat_tmp'

# TCP
listen_addresses = '$PRIVATE_IP_ADDR'
port = 5432
max_connections = 40

# Localization
datestyle = 'iso, mdy'
timezone = 'UTC'
lc_messages = 'en_US.UTF-8'
lc_monetary = 'en_US.UTF-8'
lc_numeric = 'en_US.UTF-8'
lc_time = 'en_US.UTF-8'
default_text_search_config = 'pg_catalog.english'

# Memory
shared_buffers = 1GB
work_mem = 64MB
maintenance_work_mem = 512MB
effective_cache_size = 2GB
dynamic_shared_memory_type = posix
random_page_cost = 1.2

# Backups
archive_mode = on
wal_level = archive
archive_command = '[ ! -f /mnt/db-archive/xlogs/%f.gz ] && gzip -c %p > /mnt/db-archive/xlogs/%f.gz'
archive_timeout = 5min
max_wal_senders = 1

# Checkpoints
wal_buffers = 16MB
checkpoint_segments = 32
checkpoint_timeout = 10min
checkpoint_completion_target = 0.9

# Logging
logging_collector = on
log_rotation_age = 1d
log_rotation_size = 128MB
log_truncate_on_rotation = on
log_min_duration_statement = 250ms
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_line_prefix = '%t '
log_timezone = 'UTC'
EOF


# STORAGE
log "Setting up backup storage"
mkdir -p /mnt/db-archive
umount /mnt/db-archive &>/dev/null || true
mkfs.ext4 -q "$STORAGE_DEV"
add_line "$STORAGE_DEV /mnt/db-archive ext4 defaults 0 0" /etc/fstab
mount /mnt/db-archive
chown postgres:postgres /mnt/db-archive


# DB BACKUPS
log "Configuring DB backups"
su - -c "mkdir -p /mnt/db-archive/xlogs/" postgres
cat > /usr/local/bin/backup-hive-db.sh << 'EOF'
#!/bin/bash
set -e

TIME="$(date '+%Y-%m-%d_%H:%M:%S')"
echo ""
echo "** Creating DB basebackup for $TIME **"
DIR="/mnt/db-archive/$TIME/"
mkdir "$DIR"
pg_basebackup --pgdata="$DIR" --format=plain
echo ""
echo "** Removing old backups **"
find /mnt/db-archive/ -maxdepth 1 -mtime +6 -exec rm -rv {} \\;
find /mnt/db-archive/xlogs/ -mtime +6 -exec rm -v {} \\;
echo ""
echo "** Removing old log files **"
find /var/lib/postgresql/9.4/main/pg_log -mtime +6 -exec rm -v {} \\;
EOF
chmod 755 /usr/local/bin/backup-hive-db.sh
# cron job
crontab -u postgres - << EOF
20 12 * * * /usr/local/bin/backup-hive-db.sh >> /var/log/backup-hive-db.log 2>&1
EOF
# log file
touch /var/log/backup-hive-db.log
chown postgres:postgres /var/log/backup-hive-db.log
cat > /etc/logrotate.d/backup-hive-db << EOF
/var/log/backup-hive-db.log
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


# DB RESTORE
log "Creating DB restore script"
cat > /root/restore-hive-db.sh << 'EOF'
#!/bin/bash
# Restore Hive DB from backup
# Usage:   restore-hive-db.sh <backup-dir>
# Example: restore-hive-db.sh /mnt/db-archive/2016-01-27_15:00:00

set -e

PGDATA='/var/lib/postgresql/9.4/main'
ARCHIVE_XLOGS='/mnt/db-archive/xlogs'

c0="\033[0m"; c1="\033[0;31m"; c2="\033[0;36m"; [ -t 1 ] || { c0=''; c1=''; c2=''; }
die() { printf "${c1}Error: %s$c0\n" "$*"; exit 1; }
log() { printf "${c2}** %s$c0\n" "$*"; }

[ -n "$1" ] || die "Base backup directory parameter expected"
[ -d "$1" ] || die "'$1' is not a directory"
DIR="$1"

printf "${c2}Are you sure you want to restore the DB from '$DIR'? [YES|no]$c0 "
read ANSWER
[ "$ANSWER" = 'YES' ] || { log "Exiting..."; exit 2; }

log "Stopping PostgreSQL"
/etc/init.d/postgresql stop

log "Removing old corrupted data"
rm -rf "$PGDATA"
mkdir -p "$PGDATA"
cd "$PGDATA"

log "Copying backed up data to '$PGDATA'"
(cd "$DIR" && tar cf - . ) | tar xf -

log "Setting up recovery config '$PGDATA/recovery.conf'"
echo "restore_command = 'gzip -dc \"$ARCHIVE_XLOGS/%f.gz\" > \"%p\"'" > "$PGDATA/recovery.conf"
chown -R postgres:postgres "$PGDATA"
chmod 0700 "$PGDATA"

log "Starting PostgreSQL"
/etc/init.d/postgresql start
EOF
chmod 755 /root/restore-hive-db.sh


# CREATE DB USER / DB
log "Starting PostgreSQL, adding 'hive' user"
/etc/init.d/postgresql start
su - -c "createuser --no-createdb --login --no-createrole --no-superuser hive" postgres
su - -c "psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c \"alter user hive with password '$PG_HIVE_PASSWORD';\"" postgres


# INSTALL CCI-PINGU
log "Installing and configuring CCI-Pingu"
su - -c "mkdir cci-pingu" hive
cp cci-pingu.tgz /srv/hive/
chown hive:hive /srv/hive/cci-pingu.tgz
su - -c "tar xfz cci-pingu.tgz -C cci-pingu" hive
rm /srv/hive/cci-pingu.tgz
cat > /srv/hive/cci-pingu/config/hive-db.conf << EOF
{
  "organisation": "salsita",
  "interval": 60,
  "directory": "/srv/hive",
  "timeout": 45,
  "token": "$CCI_TOKEN",
  "project": "hive",
  "branch": "develop",
  "artifacts": [
    "db.dump"
  ],
  "script": "/srv/hive/.cci-update-hive-db.sh"
}
EOF
chown hive:hive /srv/hive/cci-pingu/config/hive-db.conf


# HELPERS
log "Installing helper functions"
cat > /usr/local/bin/reset-hive-db.sh << EOF
#!/bin/bash
su - -c "dropdb hive" postgres
su - -c "createdb -O hive hive" postgres
EOF
chmod 755 /usr/local/bin/reset-hive-db.sh
# sudoers
add_line 'hive ALL = NOPASSWD: /usr/local/bin/reset-hive-db.sh' /etc/sudoers
# CCI update script (gets name of dir with cci artifacts)
cat > /srv/hive/.cci-update-hive-db.sh << 'EOF'
#!/bin/bash
set -e

DIR=$1

# DB update: only when DB schema changed
CHANGED=Y
if [ -L "current" ]
then
  CHANGED=`diff "$DIR/db.dump" "current/db.dump" | wc -l`
fi
if [ "$CHANGED" != "0" ]
then
  if [ "$CHANGED" != "Y" ]
  then
    echo "Dumping current DB"
    cd current
    pg_dump -O -f final-db-dump.txt -x -d hive
    cd ..
  fi
  echo "Dropping DB and creating new one (empty)"
  sudo /usr/local/bin/reset-hive-db.sh
  echo "Loading new DB"
  psql --dbname=hive --file="$DIR"/db.dump || true
else
  echo "DB schema same as in previously installed version"
fi
echo "Linking new DB version"
rm -f current
ln -s "$DIR" current
echo "Done"
EOF
chown hive:hive /srv/hive/.cci-update-hive-db.sh
chmod 755 /srv/hive/.cci-update-hive-db.sh


# SCRIPT TRIGGERING THE INSTALL/UPDATE
log "Creating UPDATE.sh script"
cat > /srv/hive/UPDATE.sh << 'EOF'
#!/bin/bash
set -e

if [ $# -eq 0 ]
then
  echo "Updating with the latest successful build." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-db.conf --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
elif [ $# -eq 1 ]
then
  echo "Updating with requested build (number: $1)." | tee -a /srv/hive/UPDATE.log
  /usr/bin/node /srv/hive/cci-pingu/cci-pingu --config=/srv/hive/cci-pingu/config/hive-db.conf --install=$1 --run-once 2>&1 | tee -a /srv/hive/UPDATE.log
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
