#!/bin/bash

# LOAD COMMON FUNCTIONS
. ./common-prepare-functions.sh 2>/dev/null || ( echo "File ./common-prepare-functions.sh not found" ; exit 1 )

# USAGE GUIDE
print_help() {
  printf "All setup parallel upgrade for macOS and Linux script.
Mandatory files (in the same directory):
 - common-prepare-functions.sh
    contains shared functions
 - update.cfg
    contains path to the keyfile, cci token (to check availability) and
    list of machine ip addresses in formats
      KEYFILE=\"SOMEPATH\"
      MACHINENAMES=\"IP1[ IPnext]*\"
      CCITOKEN=\"CCITOKEN\"
    MACHINENAMES stands for WORKERS WEBS MANAGERS LOGINS and they all must be present,
    each as separate variable.
Mandatory param is number of the build you would like to upgrade setup to.
Example usage:
./update-setup-parallel.sh 42\n
update-setup-parallel.sh process:
* load update file
* check parameters
* check KEYFILE
* valid IPs
* check existence and successfulness of selected build
* create tmp folder and all subfolders
* create script ran in each terminal window
* run update in parallel for managers, logins and webs
* if not successful, rollback to previous build and restart workers
* else update workers, if failed - rollback everything
* clean up

NOTE: there must be 'current' symlink directory on each machine, otherwise update fails before it starts.\n\n"
}

create_windows_mac() {
  local TYPE="$1"
  shift
  for ip in $@ ; do
    CMD="osascript -e 'tell app \"Terminal\"
    do script \"$FOLDER/script.sh $FOLDER $TYPE $CCIRELEASE $ip $KEYFILE $COUNT ; exit 0\"
    end tell'"
    bash <<< "$CMD"
  done
}

create_windows_linux() {
  local TYPE="$1"
  shift
  for ip in $@ ; do
    x-terminal-emulator -e "$FOLDER"/script.sh "$FOLDER" $TYPE $CCIRELEASE $ip "$KEYFILE" $COUNT
  done
}

create_windows() {
  local SYSTEM=$(uname)
  case "$SYSTEM" in
    "Linux")
      create_windows_linux $@
      ;;
    "Darwin")
      create_windows_mac $@
      ;;
    *)
      die "Unexpected system"
  esac
}

file_cnt() {
  ls -1 "$1" | wc -l | egrep -o "[0-9]+"
}
export -f file_cnt

manag_auth_webs_update() {
  create_windows "manager" $MANAGERS
  create_windows "auth" $LOGINS
  create_windows "web" $WEBS
}

restart_workers() {
  log "Update failed, restarting workers..."
  for ip in $WORKERS ; do
    ssh -i $KEYFILE ubuntu@$ip "sudo restart hive-workers || sudo start hive-workers"
  done
}

stop_service() {
  local TYPE="$1"
  shift
  local IPS="$@"
  for ip in $IPS ; do
    log "Stopping $TYPE at $ip"
    ssh -i $KEYFILE ubuntu@$ip "sudo stop hive-$TYPE" || true
  done
}

stop_services() {
  stop_service "workers" "$WORKERS"
  stop_service "web" "$WEBS"
  stop_service "manager" "$MANAGERS"
  stop_service "auth" "$LOGINS"
}

wait_for_subprocs() {
  sleep 1s
  while [[ $( file_cnt "$FOLDER/proc"  ) != 0 ]] ; do
    sleep 1s
  done
  rm "$FOLDER"/done/*
}

clean_and_die(){
  for err in $FOLDER/err/* ; do
    log "`cat $err`"
  done
  rm -rf "$FOLDER"
  die "Failed to update setup, reverted to previous version"
}

# MAIN
trap 'clean_and_die' ERR

if [[  $1 = ""  ||  ( ! $1 =~ ^[0-9]+$ ) ]]  ; then
  print_help
  die "Parameter missing or wrong"
fi

CFGFILE="$PWD/update.cfg"

# CONFIG
. "$CFGFILE" 2>/dev/null || die "No update.cfg file provided"

PARAMS="CCITOKEN WORKERS MANAGERS WEBS LOGINS KEYFILE"

# PARAMS CHECK
log "Checking params"
for param in $PARAMS; do
  [ -n "${!param}" ] || die "$param undefined"
  export $param
done

# KEYFILE check
log "checking key file"
[ -f "$KEYFILE" ] || die "No keyfile: $KEYFILE found"

# CHECK VALID IP ADDRESSES (FORMAT)
log "Checking format of IPs from update.cgf"
for ip in $WORKERS $WEBS $MANAGERS $LOGINS ; do
  valid_ip "$ip" || die "$i not a vaild IP"
done

export CCIRELEASE="$1"

# CHECK EXISTING BUILD
CURL=$(curl -s https://circleci.com/api/v1/project/salsita/hive/"$CCIRELEASE"?circle-token="$CCITOKEN")
if grep '"outcome" : "success",' <<< "$CURL" &>/dev/null ; then
  :
else die "Build to which upgrade setup was not successful or does not exists"
fi

log "Creating temp folder structure"

export KEYFILE
export FOLDER=$(mktemp -d)
mkdir -p "$FOLDER/proc"
mkdir -p "$FOLDER/done"
mkdir -p "$FOLDER/msg"
mkdir -p "$FOLDER/err"
mkdir -p "$FOLDER/prev"

echo '#!/bin/bash
die() {
  rm proc/$PROC
  kill -9 $PROC
}

err_inform(){
  echo "$@"
  echo "$TYPE at $IP failed:" > "err/$$"
  echo "$@" >> "err/$$"
}

ssh_cmd() {
  ssh -i "$KEY" ubuntu@"$IP" "$@"
}

file_cnt() {
  ls -1 "$1" | wc -l | egrep -o "[0-9]+"
}
export -f file_cnt

FOLDER="$1"
export TYPE="$2"
BUILD="$3"
export IP="$4"
export KEY="$5"
MACHINES_COUNT="$6"
cd "$FOLDER"
export PROC=$$
touch proc/$PROC
# FILES prev/$PROC HOLD PREVIOUS BUILD NUMBER
echo "Getting prev build"
ssh_cmd "sudo -i -u hive readlink current | egrep -o \"[0-9]+\" | head -1" > prev/$PROC ||
  ( err_inform "Can not connect to $TYPE $IP, or no current build set up" ; die )
export PREV=$(cat prev/$PROC)
sleep 1s
[[ $( file_cnt err  ) = 0 ]] || die
echo "Updating to $BUILD"
ssh_cmd "sudo -i -u hive ./UPDATE.sh $BUILD" && touch "done/$PROC" || err_inform "Failed to update $TYPE at $IP"
# GIVE IT TIME TO FAIL, IF NOT FAILED ALREADY
sleep 1s
echo "Checking status"
[[ $( ssh_cmd "sudo status hive-$TYPE" ) =~ "hive-$TYPE start/running" ]] || err_inform "hive-$TYPE did not start"
while true ; do
  if [[ $( file_cnt err ) = 0 ]] ; then
    [[ $( file_cnt done ) = $MACHINES_COUNT ]] && break || true
    echo "Waiting for all machines to finish"
  else
    echo "Rolling back to $PREV"
    ssh_cmd "sudo -i -u hive ./UPDATE.sh $PREV"
    die
  fi
  sleep 1s
done
echo "$TYPE at $IP updated to $BUILD" > msg/$PROC
echo "$TYPE at $IP updated to $BUILD"
rm proc/$PROC' > "$FOLDER/script.sh"
chmod +x "$FOLDER/script.sh"
echo $FOLDER

export COUNT=$( echo $MANAGERS $LOGINS $WEBS | wc -w)

log "Stopping all boxes"

stop_services

log "Upgrading managers, logins and webs update"

manag_auth_webs_update
wait_for_subprocs

log "Update finished"

if [[ $( file_cnt "$FOLDER/err" ) = 0 ]] ; then
  export COUNT=$( echo $WORKERS | wc -w )
  log "Updating workers"
  create_windows "workers" $WORKERS
else
  log "Update failed, restarting workers"
  restart_workers
  clean_and_die
fi

wait_for_subprocs

if [[ $( file_cnt "$FOLDER/err" ) != 0 ]] ; then
  # GET PREVIOUS BUILD NUMBER AND ROLLBACK
  # ALL FILES IN $FOLDER/prev CONTAINS PREVIOUS BUILD NUMBER, SO WE JUST NEED ONE
  export CCIRELEASE=$( cat $( ls -1 "$FOLDER/prev" | head -1) )
  export COUNT=$( echo $MANAGERS $LOGINS $WEBS | wc -w )
  log "Workers update failed, rolling back whole setup"
  manag_auth_webs_update
  wait_for_subprocs
  restart_workers
  clean_and_die
fi

for msg in "$FOLDER"/msg/* ; do
  log "`cat $msg`"
done

rm -rf "$FOLDER"

# SUCCESS!
RESULT_MESSAGE='SUCCESS'
