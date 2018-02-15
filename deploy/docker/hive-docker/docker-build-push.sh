#!/bin/bash

set -eo pipefail

TAG="hive:${CIRCLE_BUILD_NUM}"
AWS_DOCKER_URL="862392389649.dkr.ecr.eu-central-1.amazonaws.com/veladev-test/"

# THE aws RETURNS DOCKER COMMAND FOR LOGIN TO AWS DOCKER REPOSITORY
LOGIN=$(aws ecr get-login --region eu-central-1)

# THIS IS THE ACTUAL LOGIN
$LOGIN

cp -r dist node_modules package.json deploy/docker/hive-docker

cd deploy/docker/hive-docker

docker build -t "$TAG" .
docker tag "$TAG" "${AWS_DOCKER_URL}/${TAG}"
docker push "${AWS_DOCKER_URL}/${TAG}"
