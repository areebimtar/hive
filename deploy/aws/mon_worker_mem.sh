#!/bin/bash

ps -C node -o pid,rss,vsz,%mem | tail -n +2 > /tmp/ps.out

lsof -c node | awk '$9 ~ /\.log$/ { print $2, $9 }' | sed 's!/var/log/hive-workers/!!;s/\.log$//' | uniq > /tmp/lsof.out

join -j 1 /tmp/ps.out /tmp/lsof.out > /tmp/metrics.out

while read pid rss vsz mem worker; do
	/usr/local/bin/aws cloudwatch put-metric-data --metric-name memory --namespace $HOSTNAME --unit Kilobytes --value $vsz --dimensions WorkerID=$worker
done < /tmp/metrics.out

