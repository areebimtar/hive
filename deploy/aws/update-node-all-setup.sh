#!/bin/bash

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# USAGE GUIDE
print_help() {
  printf "\nAll setup node upgrade script.
Mandatory file: update.cfg in the same directory as update_node_all_setup.sh script
  contains path to the keyfile, and list of machine ip addresses in formats
  KEYFILE=\"SOMEPATH\"
  MACHINENAMES=\"IP1[ IPnext]*\"
  NODE_VERSION=\"vMajor.minor.micro\"
MACHINENAMES stands for WORKERS WEBS MANAGERS LOGINS and they all must be present,
each as separate variable.
You need to have locally installed nvm, for script to be able to check that
the version you want to upgrade to really exists.
Example usage:
./update-node-all-setup.sh\n\n"
}

# FUNCTION HANDLING ERRORS ON SERVICE MANIPULATION
# PARAM1 - SERVICE HANDLE TYPE
# PARAM2 - MACHINE IP
# PARAM3 - MACHINE NAME
error_on_service_handle() {
  echo "$1 at $2 - $3 failed, do you wish to ssh in(y), continue (c) or cancel the script(n)?"
  echo "Press 'y' to ssh in, 'c' to continue or 'n' to cancel"
  while true ; do
    read yn
    case $yn in
      [Yy]* ) ssh -lubuntu -i $KEYFILE $2 ; return 0 ;;
      [Nn]* ) return 1 ;;
      [Cc]* ) return 0;;
      * ) echo "Please pick your solution" ;;
    esac
  done
}

# FUNCTION HANDLING UPSTART SERVICES
# PARAM1 - MACHINE NAME
# PARAM2 - SERVICE
# PARAM3 - SERVICE ACTION
# PARAM4 - SERVICE RESULT
# PARAM5 - IPS

service_handle() {
  local MACHINE_NAME="$1"
  local SERVICE="$2"
  local SERVICE_ACTION="$3"
  local SERVICE_RESULT="$4"
  local IPS="$5"

  for i in $IPS ; do
    log "$SERVICE_ACTION $MACHINE_NAME $i"
    local RES=$(ssh -lubuntu -i "$KEYFILE" $i "sudo $SERVICE_ACTION $SERVICE" 2>&1)
    if [[ ! $RES =~ "$SERVICE $SERVICE_RESULT" ]] ; then
      echo "$RES"
      error_on_service_handle "$SERVICE_ACTION" "$i" "$MACHINE_NAME" || return 1
    fi
  done
}

# FUNC STOPPING SERVICES IN CASCADE

cascade_service_stop() {
  local SERVICE_ACTION="stop"
  local SERVICE_RESULT="stop/waiting"

# STOPPING WORKERS
  service_handle "Worker" "hive-workers" "$SERVICE_ACTION" "$SERVICE_RESULT" "$WORKERS" || return 1

# STOPPING WEBS
  service_handle "Web" "hive-web" "$SERVICE_ACTION" "$SERVICE_RESULT" "$WEBS" || return 1

# STOPPING MANAGERS
  service_handle "Manager" "hive-manager" "$SERVICE_ACTION" "$SERVICE_RESULT" "$MANAGERS" || return 1

# STOPPING LOGINS
  service_handle "Login" "hive-auth" "$SERVICE_ACTION" "$SERVICE_RESULT" "$LOGINS" || return 1
}

# FUNC UPDATING ONE TYPE OF MACHINES
# PARAM1 - MACHINE NAMES
# PARAM2 - IPS
# THE NVM AND ALL NODE VERSIONS ARE INSTALLED TO /home/ubuntu AND THEN SET UP TO BE USABLE FOR root
# AND hive USERS. IT'S DONE THIS WAY, BECAUSE AS WE UPDATE NODE REMOTELY, NVM CAN'T SET UP NEWLY 
# INSTALLED NODE VERSIONS AS DEFAULT ALIAS FOR USER WHICH IT IS INSTALLED FOR. SO USER ubuntu WILL 
# ALWAYS HAVE THE FIRST VERSION INSTALLED, BUT ROOT AND HIVE WILL HAVE THE ONE WE INSTALL WITH THIS 
# SCRIPT. THIS NEEDS TO BE KEPT IN MIND WHILE CHOOSING ANOTHER UPDATE METHOD, WHICH IS NOT RECOMMENDED.

update_one_type() {
  local MACHINE_NAMES="$1"
  local IPS="$2"
  local SCRIPT='#!/bin/bash

if [[ ! -d ~/.nvm ]] ; then
  curl https://raw.githubusercontent.com/creationix/nvm/v0.31.4/install.sh | bash
fi

CURR=`/usr/bin/node --version`

if [[ $CURR == '"$NODE_VERSION"' ]] ; then
  echo "'"$NODE_VERSION"' already in place"
  start hive-auth 2>/dev/null || start hive-manager  2>/dev/null || start hive-web 2>/dev/null || start hive-workers 2>/dev/null
  exit 0;
fi

rm /usr/bin/node
rm -rf /srv/hive/.nvm
source ~/.nvm/nvm.sh && nvm install '"$NODE_VERSION"'
cp -r ~/.nvm /srv/hive/.nvm
chown -R hive:hive /srv/hive/.nvm
ln -s /srv/hive/.nvm/versions/node/'"$NODE_VERSION"'/bin/node /usr/bin/node
setcap "cap_net_bind_service=+ep" /srv/hive/.nvm/versions/node/'"$NODE_VERSION"'/bin/node
start hive-auth 2>/dev/null || start hive-manager  2>/dev/null || start hive-web 2>/dev/null || start hive-workers 2>/dev/null'

  for i in $IPS ; do
    log "Updating $MACHINE_NAMES at $i"
    if ! ssh -lubuntu -i "$KEYFILE" $i 'sudo bash -s' <<< "$SCRIPT" ; then
      error_on_service_handle "Updating" "$i" "$MACHINE_NAMES" ||  ( echo "Error on update of $i, manual cancellation" ; return 1 )
    fi
  done
    
}


# FUNC CASCADE UPDATING ALL MACHINES

cascade_update_all() {
  update_one_type "Logins" "$LOGINS" || return 1
  update_one_type "Managers" "$MANAGERS" || return 1
  update_one_type "Webs" "$WEBS" || return 1
  update_one_type "Workers" "$WORKERS" || return 1
}


# FUNC CHECKING SERVICES STATUS

cascade_service_start_check() {
  local SERVICE_ACTION="status"
  local SERVICE_RESULT="start/running"

# CHECKING LOGIN SERVERS
  service_handle "Login" "hive-auth" "$SERVICE_ACTION" "$SERVICE_RESULT" "$LOGINS" || return 1

# CHECKING MANAGERS
  service_handle "Manager" "hive-manager" "$SERVICE_ACTION" "$SERVICE_RESULT" "$MANAGERS" || return 1

# CHECKING WEB SERVERS
  service_handle "Web" "hive-web" "$SERVICE_ACTION" "$SERVICE_RESULT" "$WEBS" || return 1

# CHECKING WORKERS
  service_handle "Worker" "hive-workers" "$SERVICE_ACTION" "$SERVICE_RESULT" "$WORKERS" || return 1
}

if [[ "$1" != "" ]] ; then
  print_help
  exit 1
fi

# CONFIG
. "$PWD"/update.cfg 2>/dev/null || die "No update.cfg file provided"

PARAMS="WORKERS MANAGERS WEBS LOGINS KEYFILE NODE_VERSION"

# PARAMS CHECK
log "Checking params"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# CHECK NVM IS INSTALLED
if [[ ! -d ~/.nvm ]] ; then
  print_help
  exit 1
fi

# KEYFILE check
log "checking key file"
[ -f "$KEYFILE" ] || die "No keyfile: $KEYFILE found"

# CHECK VALID IP ADDRESSES (FORMAT)
log "Checking format of IPs from update.cgf"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  valid_ip "$i" || die "$i not a vaild IP"
done

# CHECK NODE VERSION
log "Checking node version existance"
source ~/.nvm/nvm.sh

# ECHO WITH XARGS TRIMS THE RESULT OF WHITESPACES
RESULT=$( nvm ls-remote  | grep "\<$NODE_VERSION\>" | xargs echo -n )

if [[ ! ( "$RESULT" =~ ^v[0-9]+(\.[0-9]+){2}$ )  ]] ; then
  echo "Chosen version is not available, please pick one from these:"
  nvm ls-remote
  exit 1
fi

# CHECK SSH AVAILABILITY
log "Checking IPs for ssh avalability with 3s timeout"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  if ! ssh -o ConnectTimeout=3 -lubuntu -i "$KEYFILE" $i ':' &>/dev/null ; then
    die "$i is not available for ssh"
  fi  
done
log "All IPs are available and ready for the update"

# CASCADE STOP ALL SERVICES
log "Stopping all services in cascade"
cascade_service_stop || die "stopping services"

# UPDATING ALL
log "Updating all setup in cascade + running services"
cascade_update_all || die "updating services"

# CHECKING STARTED SERVICES
log "Checking started services"
cascade_service_start_check || die "starting services"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
