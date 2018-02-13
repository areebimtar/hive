#!/bin/bash

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# USAGE GUIDE
print_help() {
  printf "\nAll setup cci-pingu upgrade script. This scritp updates cci-pingu
to the chosen release provided by file.
Mandatory file: update.cfg in the same directory as update_all_setup.sh script
and cci-pingu.tgz file, also in the same directory.
  contains path to the keyfile, cci token (to check availability) and 
 list of machine ip addresses in formats
  KEYFILE=\"SOMEPATH\"
  MACHINENAMES=\"IP1[ IPnext]*\"
MACHINENAMES stands for WORKERS WEBS MANAGERS LOGINS and they all must be present,
each as separate variable.
Example usage:
./update-cci-pingu-script.sh\n\n"
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
# PARAM1 - MACHINE NAMES
# PARAM2 - IPS

update_one_type() {
  local MACHINE_NAMES="$1"
  local IPS="$2"
  local SCRIPT='#!/bin/bash

mv /tmp/cci-pingu.tgz /srv/hive
mkdir -p /tmp/back
cp -r /srv/hive/cci-pingu/config/*.conf /tmp/back
rm -rf /srv/hive/cci-pingu
mkdir /srv/hive/cci-pingu
tar xfz /srv/hive/cci-pingu.tgz -C /srv/hive/cci-pingu
cp -r /tmp/back/*.conf /srv/hive/cci-pingu/config/
chown -R hive:hive /srv/hive/cci-pingu
rm /srv/hive/cci-pingu.tgz
rm -rf /tmp/back'

  for i in $IPS ; do
    log "Updating $MACHINE_NAMES at $i"
    scp -i "$KEYFILE" cci-pingu.tgz ubuntu@${i}:/tmp/ || ( "Error on scp to $i, canceling" ; return 1 )
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
. "$PWD"/update.cfg 2>/dev/null || die "No update.cfg file provided"

PARAMS="WORKERS MANAGERS WEBS LOGINS KEYFILE"

# PARAMS CHECK
log "Checking params"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
done

# CHECK CCI-PINGU FILE IS PRESET
log "Checking cci-pingu.tgz file presention"
[ -f "$PWD"/cci-pingu.tgz ] || die "cci-pingu.tgz file not present"

# KEYFILE CHECK
log "Checking key file"
[ -f "$KEYFILE" ] || die "No keyfile: $KEYFILE found"

# CHECK VALID IP ADDRESSES (FORMAT)
log "Checking format of IPs from update.cgf"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  valid_ip "$i" || die "$i not a valid IP"
done

# CHECK SSH AVAILABILITY
log "Checking IPs for ssh avalability with 3s timeout"
for i in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  if ssh -o ConnectTimeout=3 -lubuntu -i "$KEYFILE" $i ':' &>/dev/null ; then
    :
  else die "$i is not available for ssh"
  fi  
done
log "All IPs are available and ready for the update"

# UPDATING ALL
log "Updating all cci-pingus in setup"
cascade_update_all || die "updating cci-pingu"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
