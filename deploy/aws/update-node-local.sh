#!/bin/bash

set -e

# RUN AS ROOT
if [[ $(whoami) != 'root' ]] ; then
  echo "Please run as root"
  exit 1
fi

NODE_VERSION="$1"

if [[ ! "$NODE_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] ; then
  echo 'Please provide node version in form "vNumber.Number.Number"'  
  exit 2
fi

su -c 'cd /home/ubuntu && export NVM_HOME=/home/ubuntu/.nvm && . .nvm/nvm.sh && nvm install '"$NODE_VERSION"'' ubuntu || ( echo "Node not installed" ; exit 3 )
rm -rf /usr/bin/node
rm -rf /srv/hive/.nvm
cp -r /home/ubuntu/.nvm /srv/hive/
chown -R hive:hive /srv/hive/.nvm
ln -s /srv/hive/.nvm/versions/node/"$NODE_VERSION"/bin/node /usr/bin/node
setcap 'cap_net_bind_service=+ep' /srv/hive/.nvm/versions/node/"$NODE_VERSION"/bin/node # node can bind ports < 1024
