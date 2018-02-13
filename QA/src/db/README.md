# Docker build
Builds a postresql docker image for hive
1. initializes db cluster
2. creates database, roles ...
3. configures access

for DB schema changes, you need to edit ./docker/create_db.sql and run 'make docker'
