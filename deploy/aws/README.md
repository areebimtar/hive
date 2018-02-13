## How to install a new box in AWS setup

As the first step, make sure there is a database box (PostgreSQL RDS instance) in the setup, with `hive` user, some password, and that there are two empty DBs there: `hive` and `hive_auth`. This is because all other boxes in the setup (except for load balancers) talk to the DB directly.

To install a box (once it is created using the AWS console and provisioned with Ubuntu 14.04 linux image), select a `prepare-box-<role>.sh` script in this directory based on the role the box will play in the setup.

Under `root` user on target machine, create a subdirectory in the home directory, and copy the shell script there, along with the following files:
* `cert.tgz`: HTTPS certificates, used also for JWT calculations,
* `cci-pingu.tgz`: SW installer / updater; get the latest release from [here](https://github.com/salsita/cci-pingu/releases),
* `json-merge.js`: tool for patching configuration files, stored one directory up from here.

The `cert.tgz` archive should contain public and private keys and a certificate, optionally under some directory, for example

```
$ tar tfvz cert.tgz 
drwxrwxr-x  0 hive   hive        0 Dec 22 14:29 cert/
-rw-r--r--  0 hive   hive    14636 Dec 22 14:09 cert/salsitasoft_com_bundle_2016.crt
-rw-r--r--  0 hive   hive     1675 Dec 22 14:11 cert/salsitasoft_com_2016.key
-rw-rw-r--  0 hive   hive      451 Dec 22 14:29 cert/salsitasoft_com_2016.public.key
```

There is one extra file that `prepare-box-<role>.sh` loads as its dependecy: `install-hive.cfg`, which is a set of `VARIABLE=VALUE` lines defining environmental variables storing possibly sensitive information (IP addresses, user names, DB names, passwords, connection strings, ...). Each role needs different set of variables, and if `install-hive.cfg` file is missing, or there is some variable missing in it, the shell script will stop and list what exactly is missing. When creating the `install-hive.cfg` file, you can copy it over from already installed box of the same role and simply edit the values based on current environment.

**The shell script must be started under `root` user without any parameters.**

## How to set up an AWS "1-box"

A 1-box runs everything on a single instance. To set up a dev box on AWS,
 
1. use the EC2 console to create an aws instance. The easiest way to do this is to create another instance from a current 1-box, but you
 can start from scratch and do the following
 	* Use an ubuntu 14 ami
 	* put it in the dev-1-box security group
 	* use the velaNonProductionKey
2. optionally configure a friendly dns name for your box (e.g. foo.getvela.com or bar.salsitasoft.com). If you don't do this, you'll need
to put up with SSL warnings in the browser. 
	* See Boon for help with getvela.com subdomains and SSL certificates
	* See jankotrlik for help with salsitasoft.com subdomains and SSL certificates
3. now ssh to the machine (e.g. `ssh -i velanonprodkey ubuntu@boon.getvela.com`)
4. create an install-hive directory in your home directory and copy the following files there:
	* `cci-pingu.tgz (`see above)
	* `prepare-box-dev.sh` (from this directory)
	* `common-prepare-functions.sh` (from this directory)
	* `cert.tgz` (e.g. from boon or jankotrlik or generate your own with `auth/create_ssc.sh`)
	* `json-merge.js` (one directory up from here)
5. create a file called install-hive.cfg in that directory, populate it with the following information, replacing
all the XXXXX values with real ones.
	```
	NODE_VERSION="v6.7.0"
	CCI_TOKEN="XXXXX"
	AS_DOMAIN="XXXXX"
	LOGIN_DOMAIN="XXXXX"
	LOGIN_URL="XXXXX"
	PRIV_KEY="/srv/hive/cert/XXXXX"
	PUB_KEY="/srv/hive/cert/XXXXX"
	CERT="/srv/hive/cert/XXXXX"
	PG_HIVE_PASSWORD="H1ve2016"
	ETSY_KEY="XXXXX"
	ETSY_SECRET="XXXXX"
	CCI_UPDATE="auto"
	```

	* The AS_DOMAIN, LOGIN_DOMAIN, and LOGIN_URL will all be the hostname of this machine (e.g. boon.getvela.com or foo.salsitasoft.com).
	* The PRIV_KEY, PUB_KEY and CERT are the names of the files in your cert.tgz file
	* The Etsy Key and Secret  and CCI_TOKEN can be copied from other working deployments or found in a secret drawer that has a magic key that is maintained by jankotrlik.

6. `sudo su` in that directory then run `./prepare-box-dev.sh`

## How to update production

### Configure update-staging.cfg and update-production.cfg

In this directory (deploy/aws) you'll need an update-<environment>.cfg file for the
staging and production environments.  They should look something like this:

Note: The IP addresses are current as of December 15, 2016 but check AWS before assuming they are correct

update-production.cfg
```
KEYFILE="<path to local production ssh key>"
MANAGERS="54.183.229.113"
WORKERS="54.183.210.248 54.153.120.176 54.183.206.230 54.183.2.10"
WEBS="52.9.43.253 52.52.82.181"
LOGINS="52.8.45.97"
CCITOKEN="<cci token>"
```

update-staging.cfg
```
KEYFILE="<path to local non-production ssh key>"
MANAGERS="52.52.139.68"
WORKERS="52.53.136.44 52.53.143.13"
WEBS="52.53.92.13 52.8.249.98"
LOGINS="52.53.97.255"
CCITOKEN="<cci token>"
```

### Restarting

1. Open loggly and configure a search for `tag:"production" json.level:"error"` for the last 5 minutes so you
can check for errors after restart
2. From this directory, run `./restart-setup.sh` and observe the console output for status
3. Once complete check loggly for unusual errors during startup, etc.
4. Do a spot check of production to see if you can update and sync through to etsy. A common
restart issues is that the sync spinner spins and no numbers appear. This is usually because the web
front-ends failed to reconnect to the manager.
5. if you see errors in the log for the web front ends or if the spinner appears in step
4, restart the web front ends by running `./restart-setup.sh` with the stop and start lines for
manager, auth, and workers commented out (so only the webs are stopped and restarted).


### Updating

1. Open up loggly like in restarting step 1.
2. from this directory, run `./update-all-setup.sh BUILD_NUM` and observe the console output for status
3. Check for success via steps 3, 4, 5 above.
4. Verify that the right SHA is on getvela.com by inspecting the DOM and looking for it in the <head>
5. Tag the release SH via  `git tag -am 'Release-X.X.X' 'Release-3.X.X.X'; git push --tags`
6. Merge release into develop
7. If there isn't a current release in progress, delete the release branch...
8. Have a drink!