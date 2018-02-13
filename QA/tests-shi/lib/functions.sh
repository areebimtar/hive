PROG=$(basename $0)
export LC_ALL="en_US.UTF-8"
QA_USER_ID=${QA_USER_ID:-2000}

# FANCY LOG MSGS
c0="\033[0m"; c1="\033[0;31m"; c2="\033[0;36m"; [ -t 1 ] || { c0=''; c1=''; c2=''; }
die() { printf "${c1}ERROR: %s$c0\n" "$*"; exit 1; }
log() { printf "${c2}** %s$c0\n" "$*"; }
log1() { printf "${c2}** 	%s$c0\n" "$*"; }
log2() { printf "${c2}** 		%s$c0\n" "$*"; }


#--------------------------------------------------------------------------------
# check if variable is defined, die if not
check_variables() {
	for param in "$@"; do
		[ -n "${!param}" ] || die "environment variable $param is not defined (see the config file)"
	done
}


#--------------------------------------------------------------------------------
# Smart adding file lines (add the line if it is not there yet)
add_line() {
	line=$1 file=$2; [ -n "$2" ] || die "add_line(): 2 parameters expected"
	grep -F -- "$line" "$file" &> /dev/null || printf "%s\n" "$line" >> "$file"
}


#--------------------------------------------------------------------------------
# source config files, ensure mandatory variables are defined 
# (QA_INSTANCE, QA_DIR, INSTANCES_DIR)
#  if $1 = 'virt' (optional)
#	- source virt/env-xx.sh, check for QA_INSTANCE_VIRT
read_configs() {
	local check_virt=$1
		# main config
	. "$script_dir/../etc/qa.cfg" &>/dev/null || { log "WARNING: config file '$script_dir/../etc/qa.cfg' not found"; }
	check_variables QA_INSTANCE QA_DIR INSTANCES_DIR
		# instance config
	. "$INSTANCES_DIR/$QA_INSTANCE/etc/env.sh" &>/dev/null || { log "WARNING: config file '$INSTANCES_DIR/$QA_INSTANCE/etc/env.sh' not found"; }
		# instance virtual config
	if [ "$check_virt" = 'virt' ]; then
	       check_variables QA_INSTANCE_VIRT
		. "$INSTANCES_DIR/$QA_INSTANCE/etc/virt/env-${QA_INSTANCE_VIRT}.sh" &>/dev/null || {
			log "WARNING: config file '$INSTANCES_DIR/$QA_INSTANCE/etc/virt/env-${QA_INSTANCE_VIRT}.sh' not found";
	       	}
	fi
}


#--------------------------------------------------------------------------------
# print test file names
get_virt_params() {
	[ $# -eq 1 ] || die "Error: install_test_harness: 1 params expected, got ($@)"
	local build_no=$1 test_dir
	test_dir="$INSTANCES_DIR/$QA_INSTANCE/builds/$build_no/QA/tests-shi/tests"
	find "$test_dir" -type f -name 'test_*.py' -printf "%f\n" | sort
}


#--------------------------------------------------------------------------------
# re/create a postgres DB
create_db_postgres() {
	[ $# -eq 7 ] || die "Error: create_db_postgres: 7 params expected, got ($@)"
	db_host=$1 db_port=$2 db_root=$3 db_root_pass=$4 db_name=$5 db_user=$6 db_pass=$7

	log1 "Creating database $db_name, user $db_user"
	PGPASSWORD=$db_root_pass psql --no-psqlrc -v ON_ERROR_STOP=1 -h "$db_host" -p "$db_port" -U "$db_root" -d "postgres" <<-EOF
		SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$db_name' AND pid <> pg_backend_pid();
		DROP DATABASE IF EXISTS $db_name;
		CREATE DATABASE $db_name;
		DO
		\$body\$
		BEGIN
		   IF NOT EXISTS (SELECT * FROM   pg_catalog.pg_user WHERE  usename = '$db_user') THEN
		      CREATE ROLE $db_user LOGIN PASSWORD '$db_pass';
		   END IF;
		END
		\$body\$;
		GRANT ALL ON DATABASE $db_name TO $db_user;
	EOF
}


#--------------------------------------------------------------------------------
# drop a postgres DB
drop_db_postgres() {
	[ $# -eq 5 ] || die "Error: create_db_postgres: 5 params expected, got ($@)"
	db_host=$1 db_port=$2 db_root=$3 db_root_pass=$4 db_name=$5

	log1 "Dropping database $db_name"
	PGPASSWORD=$db_root_pass psql --no-psqlrc -v ON_ERROR_STOP=1 -h "$db_host" -p "$db_port" -U "$db_root" -d "postgres" <<-EOF
		SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$db_name' AND pid <> pg_backend_pid();
		DROP DATABASE IF EXISTS $db_name;
	EOF
}


#--------------------------------------------------------------------------------
# re/create a mysql DB
create_db_mysql() {
	[ $# -eq 7 ] || die "Error: create_db_postgres: 7 params expected, got ($@)"
	local db_host=$1 db_port=$2 db_root=$3 db_root_pass=$4 db_name=$5 db_user=$6 db_pass=$7 user_exists users i

	log1 "Creating database $db_name, user $db_user"
		# get list of users
	users=`MYSQL_PWD=$db_root_pass mysql --user=$db_root --skip-column-names --batch <<-EOF |
		SELECT User FROM mysql.user;
	EOF
	sort | uniq`

		# re-create the database
	MYSQL_PWD=$db_root_pass mysql --user=$db_root --batch <<-EOF
		DROP DATABASE IF EXISTS $db_name;
		CREATE DATABASE $db_name;
	EOF
		# create user if not exist 
	user_exists=n
	for i in $users; do
		if [ "$i" = "$user_name" ]; then
			user_exists=y
			break
		fi
	done
	if [ "$user_exists" != "y" ]; then
		MYSQL_PWD=$db_root_pass mysql --user=$db_root --batch <<-EOF ||
			CREATE USER '$db_user'@'localhost' IDENTIFIED BY '$db_pass';
		EOF
		true	# ignore errors
	fi
		# grant privileges
	MYSQL_PWD=$db_root_pass mysql --user=$db_root --batch <<-EOF
		GRANT ALL PRIVILEGES ON $db_name.* TO '$db_user'@'localhost';
		FLUSH PRIVILEGES;
	EOF
}


#--------------------------------------------------------------------------------
# Create symlinks for virtual instances
#  <root>/$instance_name/virt/$num -> ../
virtualize_product() {
	log2 "Creating virtual product directories"
	[ $# -eq 2 ] || die "Error: virtualize_product: 2 params expected, got ($@)"
	local build_no=$1 instance_id=$2 virts num_virts
	shift 2

	virts=(`get_virt_params "$build_no"`)
	num_virts=${#virts[@]}

		# create virtual symlinks (for restart-product unique nodejs process path)
	virt_dir="$INSTANCES_DIR/$instance_id/virt"
	rm -rf "$virt_dir"; mkdir -p "$virt_dir"
	for ((i=0 ; i < $num_virts; i++)); do
		ln -s ".." "$virt_dir/$i"
	done
}


#--------------------------------------------------------------------------------
# Create symlinks for virtual instances
#  - cp -r tests-shi ../virt/tests-shi-$num  (or other directories passed as params $3-n)
#  <root>/$instance_name/builds/$build_no/QA/tests-shi => .../QA/virt/tests-shi-$num 
virtualize_tests() {
	log2 "Creating virtual QA directories"
	[ $# -gt 2 ] || die "Error: virtualize_tests: >2 params expected, got ($@)"
	local build_no=$1 instance_id=$2 virts num_virts build_dir test_dir dir_name
	shift 2
	test_dir_names=("$@")

	build_dir="$INSTANCES_DIR/$instance_id/builds/$build_no"

	virts=(`get_virt_params "$build_no"`)
	num_virts=${#virts[@]}

		# create virtual tests dirs
	rm -rf "$build_dir/QA/virt"
	for dir_name in "${test_dir_names[@]}"; do
		test_dir="$build_dir/QA/$dir_name"
		mkdir -p "$build_dir/QA/virt"
		for ((i=0 ; i < $num_virts; i++)); do
			virt_test_dir="$build_dir/QA/virt/$dir_name-$i"
			cp -rld "$test_dir" "$virt_test_dir"
		done
	done
}


#--------------------------------------------------------------------------------
# Request a machine with selenium server + browsers
# - requests the host from broker
# - saves the session file (time-pid.session : instance_id, ip-addr, timestamp)
# - waits for selenium to come up
# - sets output var to ip-addr of the instance
get_selenium_instance() {
	[ $# -eq 6 ] || die "Error: get_selenium_instance: 6 params expected, got ($@)"
	local user=$1 passwd=$2 mng_url=$3 webdriver_check_url_tmpl=$4 session_dir=$5 result_var=$6 resp re item retry_cnt rc
	local RETRY_MAX=60
	log "Getting QA Selenium server"

	resp=`curl -sS -u "$user:$passwd" "$mng_url"` || die "Cannot get selenium instance ($rep)"
	re='"rc": *"OK"'; [[ "$resp" =~ $re ]] || die "QA server error: getting $mng_url ($resp)"

		# IP address
	re='"ip-addr": *"([^"]*)"'; [[ "$resp" =~ $re ]] || die "QA server error cannot find item 'ip-addr' in QA server response ($resp)"
	ip_addr=${BASH_REMATCH[1]}
		# AWS Instance ID
	re='"id": *"([^"]*)"'; [[ "$resp" =~ $re ]] || die "QA server error cannot find item 'id' in QA server response ($resp)"
	instance_id=${BASH_REMATCH[1]}
		# Timestamp
	re='"ts": *([0-9]*)'; [[ "$resp" =~ $re ]] || die "QA server error cannot find item 'ts' in QA server response ($resp)"
	ts=${BASH_REMATCH[1]}

	log1 "Got machine: $ip_addr id=$instance_id, ts=$ts"

		# save the session file
	mkdir -p "$session_dir"
	echo "$ip_addr	$instance_id	$ts" > "$session_dir/`date +%Y%m%d_%H%M%S`-$$.session"

		# wait for server to start up
	log1 "waiting for selenium to start..."
	wd_url=`echo "$webdriver_check_url_tmpl" | sed "s/%IP_ADDR%/$ip_addr/"`
	for ((retry_cnt=0; $retry_cnt < $RETRY_MAX; retry_cnt++)); do
		if resp=`curl -Ss --connect-timeout 5 -i -u "$user:$passwd" $wd_url 2>&1`; then
			re='^HTTP/1.[0-1]  *([0-9]*)'
			if [[ $resp =~ $re ]]; then
				rc=${BASH_REMATCH[1]}
				if [ "$rc" = "200" ]; then
					log1 "Selenium server started $ip_addr"
					break
				fi
			fi
		fi
		log1 "waiting for selenium to start..."
		sleep 5
	done
	[ $retry_cnt -lt $RETRY_MAX ] || log "WARNING selenium server $ip_addr does not seem to be running"

		# return ip_addr
	eval "$result_var='$ip_addr'"

}



#--------------------------------------------------------------------------------
# Kill process with command param
kill_process() {
	[ $# -ge 2 ] || die "Error: kill_process: at least 2 params expected, got ($@)"
	local cmd=$1 params regex i pid param
	shift; params=$@
	
		# compute regex
	regex="^ *[0-9][0-9]*  *$(echo "$cmd" | sed 's/\//\\\//g')"
	for param in "${params[@]}"; do
		regex="$regex[ ]"$(echo "$param" | sed 's/\//\\\//g')
	done
	regex="$regex\$"

	i=10
	while [ $i -gt 0 ]; do
		pid=$(ps -eopid,command | awk  "/$regex/ {print \$1}")
		if [ -n "$pid" ]; then
			if [[ "$pid" =~ ^[0-9][0-9]*$ ]]; then
				log1 "killing PID $pid"
				kill "$pid"
				sleep 1
			else
				die "not killing strange PID '$pid'"
			fi
		else
			break
		fi
		i=$((i - 1))
	done
}


#--------------------------------------------------------------------------------
# (Re)start process $cmd $param in $workdir,
# redirect output to $log_file (if defined)
restart_process() {
	[ $# -ge 4 ] || die "Error: restart_process: at least 4 params expected, got ($@)"
	local cmd=$1 work_dir=$2 log_file=$3 pid params
	shift 3
	params=("$@")

	kill_process "$cmd" "${params[@]}"

	cd "$work_dir"
	log1 "Starting $cmd '${params[@]}'"
	if [ -n "$log_file" ]; then
		mkdir -p "`dirname "$log_file"`"
		"$cmd" "${params[@]}" >>"$log_file" 2>&1 &
	else
		"$cmd" "${params[@]}" &
	fi
	pid=$!
	sleep 2
	kill -0 "$pid" &>/dev/null || die "Process not running $cmd ${params[@]} ($pid)"
}


#--------------------------------------------------------------------------------
# Find the value of the environment variable of given process
# set result_var to it, or ''
get_process_env_var() {
	[ $# -eq 3 ] || die "Error: get_process_env_var: 3 params expected, got ($@)"
	local pid=$1 var_name=$2 result_var=$3 prefix_length old_ifs i env_list result=''

	prefix_length=$((${#var_name} + 1))

	env_list=()
	case "`uname`" in
		"Linux")
			old_ifs=$IFS; IFS=$'\n'
			for i in `cat "/proc/$pid/environ" 2>/dev/null | tr '\000' '\n'`; do
				env_list+=("$i")
			done
			IFS=$old_ifs
			;;

		*) # assume MacOS
			for i in `ps e -p "$pid" -ocommand`; do	# WARNING it won't work if the variable contains spaces :(
				env_list+=("$i")
			done
			;;

	esac
	for i in "${env_list[@]}"; do
		if [ "${i:0:$prefix_length}" = "$var_name=" ]; then
			result="${i:$prefix_length}"
		fi
	done
	eval "$result_var='$result'"
}


#--------------------------------------------------------------------------------
on_exit() {
	log "$RESULT_MESSAGE";
}


#--------------------------------------------------------------------------------
# Main
#--------------------------------------------------------------------------------
add_path=$1

RESULT_MESSAGE="ERROR: $PROG failed"
trap on_exit 0

# set script_dir to .../QA/bin
script_dir=$(dirname "$(readlink -e "${BASH_SOURCE[0]}")");
script_dir=${script_dir:0:${#script_dir}-3}"bin"

log "$PROG: starting ($@)"
[ "`id -u`" = "$QA_USER_ID" ] || die "$PROG must be run by a QA user with UID=$QA_USER_ID"

[ -z "$add_path" ] || PATH="$add_path:$PATH"
[ -z "$script_dir" ] || PATH="$script_dir:$script_dir/default:$PATH"
