#!/bin/bash

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# USAGE GUIDE
print_help() {
  printf "\nAll setup upgrade script.
Mandatory file: update-<environment>.cfg in the same directory as update_all_setup.sh script
  contains path to the keyfile, cci token (to check availability) and 
 list of machine ip addresses in formats
  KEYFILE=\"SOMEPATH\"
  MACHINENAMES=\"IP1[ IPnext]*\"
  CCITOKEN=\"CCITOKEN\"
MACHINENAMES stands for WORKERS WEBS MANAGERS LOGINS and they all must be present,
each as separate variable.
Mandatory first param is either word \"latest\", which upgrades setup to the latest
  available build on branch selected durign setup installation, or number
  of the build you would like to upgrade setup to
Mandatory second param is either staging or production specifying the environment to deploy to
Example usage:
./update-all-script.sh latest staging
./update-all-script.sh 42 production\n\n"
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
    if [[ $RES =~ "$SERVICE $SERVICE_RESULT" ]] ; then
      :
    else echo "$RES"
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

update_one_type() {
  local MACHINE_NAMES="$1"
  local IPS="$2"
  local SCRIPT='~/UPDATE.sh '"$CCIRELEASE"
  for i in $IPS ; do
    log "Updating $MACHINE_NAMES at $i"
    if ssh -lubuntu -i "$KEYFILE" $i 'sudo -i -u hive bash' <<< $SCRIPT ; then
      :
    else error_on_service_handle "Updating" "$i" "$MACHINE_NAMES" ||  ( echo "Error on update of $i, manual cancellation" ; return 1 )
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

if [[  $1 = ""  ||  ( $1 != 'latest' && ! $1 =~ ^[0-9]+$ ) ]]  ; then
  print_help
  die "Parameter missing or wrong"
fi

if [[ $2 != 'production' && $2 != 'staging' ]] ; then
  print_help
  die "Specify production or staging"
fi

CFGFILE="$PWD"/update-"$2".cfg

if [[ $1 = 'latest' ]] ; then
  CCIRELEASE=""
  else CCIRELEASE="$1"
fi


# CONFIG
. "$CFGFILE" 2>/dev/null || die "No update-"$2".cfg file provided"

PARAMS="CCITOKEN WORKERS MANAGERS WEBS LOGINS KEYFILE"

# PARAMS CHECK
log "Checking params"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# KEYFILE check
log "checking key file"
[ -f "$KEYFILE" ] || die "No keyfile: $KEYFILE found"

# CHECK VALID IP ADDRESSES (FORMAT)
log "Checking format of IPs from update.cgf"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  valid_ip "$i" || die "$i not a vaild IP"
done

# CHECK EXISTING BUILD
if [[ $CCIRELEASE =~ ^[0-9]+$ ]] ; then
  CURL=$(curl -s https://circleci.com/api/v1/project/salsita/hive/"$CCIRELEASE"?circle-token="$CCITOKEN")
  if grep '"outcome" : "success",' <<< "$CURL" &>/dev/null ; then
    :
  else die "Build to which upgrade setup was not successful or does not exists"
  fi
fi

# CHECK SSH AVAILABILITY
log "Checking IPs for ssh avalability with 3s timeout"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  if ssh -o ConnectTimeout=3 -lubuntu -i "$KEYFILE" $i ':' &>/dev/null ; then
    :
  else die "$i is not available for ssh"
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
