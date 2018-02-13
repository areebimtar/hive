#!/bin/bash

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# USAGE GUIDE
print_help() {
  printf "\nDelete old builds and leave N latest in all setup script. N is defined in 'update_one_type' function.
Mandatory file: update.cfg in the same directory as delete-old-builds.sh script,
  contains path to the keyfile and
  list of machine ip addresses in formats
  KEYFILE=\"SOMEPATH\"
  MACHINENAMES=\"IP1[ IPnext]*\"
Example usage:
./delete-old-builds.sh\n\n"
}

# FUNCTION HANDLING ERRORS ON FILE MANIPULATION
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

# FUNC UPDATING ONE TYPE OF MACHINES
# THE SCRIPT CONTENT IS THE IMPORTANT PART
# PARAM1 - MACHINE NAMES
# PARAM2 - IPS

update_one_type() {
  local MACHINE_NAMES="$1"
  local IPS="$2"
  local SCRIPT='sudo N=10 find /srv/hive/ -maxdepth 1 -type d -name "build-*" | sort -nr -t"-" -k2 | tail -n+$((N+1)) | xargs rm -rf'

  for i in $IPS ; do
    log "Deleting builds on $MACHINE_NAMES at $i"
    ssh -lubuntu -i "$KEYFILE" $i 'sudo bash -s' <<< "$SCRIPT"
  done
    
}

# FUNC CASCADE UPDATING ALL MACHINES
cascade_update_all() {
  update_one_type "Logins" "$LOGINS" || return 1
  update_one_type "Managers" "$MANAGERS" || return 1
  update_one_type "Webs" "$WEBS" || return 1
  update_one_type "Workers" "$WORKERS" || return 1
}

# CHECKING FOR CALL FOR HELP
if [[ "$1" != "" ]] ; then
  print_help
  exit 1
fi

# CONFIG
. "$PWD"/update.cfg 2>/dev/null || die "No updated.cfg file provided"

PARAMS="WORKERS MANAGERS WEBS LOGINS KEYFILE"

# PARAMS CHECK
log "Checking params"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# KEYFILE CHECK
log "Checking key file"
[ -f "$KEYFILE" ] || die "No keyfile: $KEYFILE found"

# CHECK VALID IP ADDRESSES (FORMAT)
log "Checking format of IPs from update.cgf"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  valid_ip "$i" || die "$i not a vaild IP"
done

# CHECK SSH AVAILABILITY
log "Checking IPs for ssh avalability with 3s timeout"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  if ssh -o ConnectTimeout=3 -lubuntu -i "$KEYFILE" $i ':' &>/dev/null ; then
    :
  else die "$i is not available for ssh"
  fi  
done
log "All IPs are available and ready for old builds delete"

# UPDATING ALL
log "Deleting old builds in setup"
cascade_update_all || die "deleting old builds"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
