### Overview

In the develop branch, we now expect to find a working rabbitmq server configured on the target environment.  For most non-production environments,
this will mean that a local rabbitmq server is set up & running before installation (directly analogous to postgres).

The prepare-box-dev.sh script does this automatically if you create a new Ubuntu environment using that script. For existing environments we need to install and configure
rabbit to do the following:

1. install rabbitmq-server and the rabbit management plugins
2. open port 15672 to allow browsing to the rabbitmq managment UI
3. create a rabbit user/password administrator account. For dev environments, it's easiest to use the default of user1/pass1 but this is configurable
via config.json in the worker project.

### How-to for Ubuntu:

```
ufw allow 15672
echo "deb http://www.rabbitmq.com/debian/ testing main" >> /etc/apt/sources.list.d/pgdg.list
wget -q https://www.rabbitmq.com/rabbitmq-release-signing-key.asc -O - | apt-key add -
apt-get update
apt-get install rabbitmq-server=3.6.6-1
rabbitmq-plugins enable rabbitmq_management
rabbitmqctl add_user user1 pass1
rabbitmqctl set_user_tags user1 administrator
```

Now start the RabbitMQ server service. The exact command depends on your Linux
distribution and system setup. Make sure you have proper access persmission.
May be one of following:
```
/etc/init.d/rabbitmq-server start
service rabbitmq-server start
sudo systemctl start rabbitmq-server.service
```

### How-to for OS X

If you use homebrew, it's very simple:

```
brew install rabbitmq
/usr/local/sbin/rabbitmqctl add_user user1 pass1
/usr/local/sbin/rabbitmqctl set_user_tags user1 administrator
```

If you don't use homebrew, you should!  If you don't want to use homebrew, there is a standalone package
and instructions here:  [https://www.rabbitmq.com/install-standalone-mac.html](https://www.rabbitmq.com/install-standalone-mac.html)

### Verifying it all worked

Browse to port 15672 (e.g. [http://localhost:15672](http://localhost:15672) or [http://hive-dev.salsitasoft.com:15672](http://localhost:15672) ). You should be prompted for user name and password and you should be able to
 log in with user1/pass1.