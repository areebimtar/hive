# QA Scripts User Guide
- intented for developers or QA engineers who would like to run automated test
- examples below are for MacOS and Linux Ubuntu-16,
project files are stored under "$HOME/Salsita/" (if you keep them elsewhere, modify the paths accordingly) 

**Table of Contents**

- [1 Installation](#1-installation)
	- [1.1 Postgres DB](#11-postgres-db)
	- [1.2 RabbitMQ](#12-rabbitmq)
	- [1.3 Python 3](#13-python-3)
	- [1.4 Shishito Test Harness](#14-shishito-test-harness)
	- [1.5 Selenium Grid](#15-selenium-grid)
	- [1.6 Nodejs](#16-nodejs)
	- [1.7 Yarn Javascript Package Manager](#17-yarn-javascript-package-manager)
	- [1.8 TLS Certificates](#18-tls-certificates)
- [2 Configuration](#2-configuration)
	- [2.1 Sudoers](#21-sudoers)
	- [2.2 Hosts](#22-hosts)
	- [2.3 User variables](#23-user-variables)
	- [2.4 Test Configuration](#24-test-configuration)
- [3 Usage](#3-usage)
	- [3.1 Building and Installing Vela](#31-building-and-installing-vela)
	- [3.2 Running the Tests](#32-running-the-tests)
	- [3.3 Debugging the Tests](#33-debugging-the-tests)

## 1 Installation
(note: some of the required components may be already installed)

**Prerequisites:**

- Linux-like OS with standard GNU tools (bash-4, coreutils-8)
MacOS distribution contains quite obsolete versions, its users might need to upgrade:
```sh
# Mac - admin
brew install bash
brew install gnu-sed --default-names
brew install findutils --default-names
brew install coreutils --default-names
brew install gnu-tar --default-names
```

- TLS certificates (*.salsitasoft.com by default)
- passwords and keys (for gmail, intercom, database)


### 1.1 Postgres DB
The test suite requires `psql` client. The server itself can be run locally or remotely (e.g. Amazon RDS).

```sh
# Linux - root
echo "deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main" > /etc/apt/sources.list.d/pgdg.list
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get -qq update
apt-get -qq install -y postgresql-client-9.5

# if server is needed
apt-get -qq install -y postgresql-9.5
/etc/init.d/postgresql start
```

```sh
# Mac - admin
brew install postgresql

# if server is needed, as user:
initdb --locale=en_US.UTF-8 --username=postgres -D /var/lib/postgres -W
pg_ctl -D /var/lib/postgres  start

```
You should know the password of the DB admin (i.e. postgres).
If you don't, you can (re)set it using `ALTER ROLE postgres PASSWORD 'xxx-secret--xxx';` in psql client


### 1.2 RabbitMQ
```sh
# Linux - root
apt-get install rabbitmq-server

rabbitmq-plugins enable rabbitmq_management
rabbitmqctl add_user user1 pass1
rabbitmqctl set_user_tags user1 administrator

```

```sh
# Mac - admin
brew install rabbitmq

rabbitmq-plugins enable rabbitmq_management
rabbitmqctl add_user user1 pass1
rabbitmqctl set_user_tags user1 administrator
```

### 1.3 Python 3
- used to run the selenium tests.


```sh
# Linux - root
apt install python3.5
apt-get install python3-venv
```

```
# Mac - admin
brew install python3
```

### 1.4 Shishito Test Harness
- clone from github
```sh
# as normal user:
mkdir -p ~/Salsita
cd ~/Salsita
git clone -b shishito-py3 https://github.com/salsita/shishito.git

# create virtual env
cd shishito
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
```

### 1.5 Selenium Grid
Shishito test harness supports multiple client setups - direct browser API, saucelabs, browserstack, or remote driver (default)
In order to use the 'remote' access locally, you need to install selenium driver, preferably in grid mode:
```sh
# as normal user:
# download a tarball (made from https://github.com/salsita/QA-general-stuff/tree/selenium-standalone)
cd ~/Salsita
curl http://qa.salsitasoft.com/qa/selenium.tgz | tar xzvf -
vi install-selenium  # edit URLs if needed, here there are linux64 drivers
./install-selenium
```
Run the selenium grid
```
# as normal user:
./grid

# alternatively you can run it inside the virtual framebuffer
xvfb-run grid
```

### 1.6 Nodejs
- other options include e.g. *nvm*
```
# Linux - root
curl https://nodejs.org/download/release/v6.7.0/node-v6.7.0-linux-x64.tar.xz | tar x -C /opt -J -f -
ln -s /opt/node-v6.7.0-linux-x64/bin/node /usr/local/bin/node
```

```
# Mac - admin
curl https://nodejs.org/download/release/v6.7.0/node-v6.7.0-darwin-x64.tar.xz | tar x -C /opt -J -f -
ln -s /opt/node-v6.7.0-linux-x64/bin/node /usr/local/bin/node
```

### 1.7 Yarn Javascript Package Manager
```sh
# Linux - root
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" > /etc/apt/sources.list.d/yarn.list
apt-get update && apt-get install yarn
```

```sh
# Mac - admin
brew install yarn
```

### 1.8 TLS Certificates
By default the test harness uses virtual host names hive_test_00.salsitasoft.com. For https to work, you need to install relevant certificates
```perl
install to e.g. $HOME/cert/
	salsitasoft_com_2017.public.key
	salsitasoft_com_2017.key
	salsitasoft_com_bundle_2017.crt
```
and configure qa.cfg accordingly

## 2 Configuration
### 2.1 Sudoers
allow user to run rabbitmqctl as root - add a line
`your-login-name ALL=(ALL) NOPASSWD: /path-to-rabbitmqctl` to sudoers
```sh
# as root:
which rabbitmqctl  # get path of the binary (on Mac it may be in /usr/local)
visudo
	
```

### 2.2 Hosts
configure virtual host names
```
# as root:
# get ip address
ifconfig
# edit hosts
vi /etc/hosts	
```

```
<your-ip-address> hive_test_00.salsitasoft.com hive_test_01.salsitasoft.com etsy_emulator
```
### 2.3 User variables
Add the following variables to your user ~/.bashrc (or equivalent - depending on the shell)

**PATH**  - Add hive and selenium and shishito paths
```
PATH=$PATH:$HOME/Salsita/hive/QA/tests-shi/bin:$HOME/Salsita/hive/QA/tests-shi/bin/hive:$HOME/Salsita/shishito:$HOME/Salsita/selenium
```

**QA_USER_ID** - safety check: the scripts check that they are run under this UID
```sh
export QA_USER_ID=`id -u`
```

**QA_LOG_DIR** - (optional) - log the test results here
```sh
export QA_LOG_DIR=$HOME/log
```
### 2.4 Test Configuration
you can start with copying the examples:
```sh
cd ~/Salsita/hive/QA/tests-shi/etc
cp virt0.cfg-example virt0.cfg
cp qa.cfg-example qa.cfg
```

**qa.cfg** - main configuration file
- update the variables in the *directories* block, if your repository is not in $HOME/Salsita/hive
- set the user names and passwords (marked 'xxx') in the example config file
- set QA_NODE_BINARY to the right node (/usr/local/bin/node - if you made the symlink)
- set correct path to certificates, e.g.:
```
export TLS_PRIV_KEY="$HOME/cert/salsitasoft_com_2017.key"
export TLS_PUB_KEY="$HOME/cert/salsitasoft_com_2017.public.key"
export TLS_CERTIFICATE="$HOME/cert/salsitasoft_com_bundle_2017.crt"
```

## 3 Usage
### 3.1 Building and Installing Vela
- Run `qa-build` to build and install the current hive version
	- the product is compiled in HIVE_PRODUCT_DIR (~/Salsita/hive/)
	- and installed into INSTANCES_DIR (~/tmp/hive-qa/) with multiple subdirectories and symlinks that allow parallel test runs

### 3.2 Running the Tests
- make sure that the required services are running
	- postgres
	- rabbitmq
	- selenium grid
- run `qa-test` to test the installed product
	- the test scripts themselves are always copied from HIVE_TEST_DIR (~/Salsita/hive/QA)
	- the framework will start up to MAX_PARALLEL_JOBS test scripts
	- logs are kept in ~/Salsita/hive/QA/tests-shi/results/hive_qa/<timestamp\> (unless you override it with QA_LOG_DIR)
- to run a single test, class or module, use the --test parameter, e.g.:
```sh
qa-test --test test_edit_single_category
```


### 3.3 Debugging the Tests
- the recommended python IDE is PyCharm (https://www.jetbrains.com/pycharm/download/)
	- it includes integrated debugger and test runner, git support, etc.
- before you start PyCharm, you need to export the variables in qa.cfg and virt0.cfg. The `pyc` script may come in handy.
- Pycharm project needs to be configured:
	- **Project Interpreter:**
		- menu File / Settings / Project Interpreter:  set to the shishito venv python3 (~/Salsita/shishito/venv/bin/python3)
	- **Debug configurations:**
		- menu Run / Edit Configurations  -- create a new python configuration
			- Script:   `<your home>/Salsita/shishito/shi.py`
			- Script parameters:  `--test      	<test-function-you-want-to-debug>`
			- Environment variables:  
				`PYTHONBUFFERED=1`
				`PYTHONPATH=<your home>/Salsita/shishito:<your home>/Salsita/hive/QA/tests-shi`
			- Working directory: `<your home>/Salsita/hive/QA/tests-shi`

