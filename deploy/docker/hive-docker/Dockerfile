from node:8.9.0

run userdel node
run groupadd -g 1000 hive
run useradd -r -m -d /srv/hive -u 1000 -g 1000 -s /bin/bash hive

add . /srv/hive

run chown -R hive:hive /srv/hive

user hive

cmd ["/bin/bash","/srv/hive/start-app.sh"]
