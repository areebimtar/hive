#!/bin/bash

# creates production artifacts from bundles (created by webpack) and production
# node_modules. in order to reduce the artifact size, we make sure the
# dev-dependencies are not packed in.

set -e

# cache existing node_modules (with dev-dependencies) and install only
# production node_modules needed for run-time. if we have the production
# node_modules cached from before, just use them to save installation time
mv node_modules node_modules.develop
[ -d node_modules.prod ] && mv node_modules.prod node_modules
yarn install --production

# create artifact archives
tar -czf web.tgz dist/web node_modules package.json
tar -czf auth.tgz dist/auth node_modules package.json
tar -czf manager.tgz dist/manager node_modules package.json
tar -czf worker.tgz dist/worker node_modules package.json

tar -czf deploy.tgz deploy/rabbit

tar -czf migrations-app.tgz migrations-app node_modules worker/src/rabbit/rabbitManagementClient.js
tar -czf migrations-auth.tgz migrations-auth node_modules/node-pg-migrate

tar -czf handler.tgz dist/handler node_modules package.json
tar -czf migrations-rabbit.tgz migrations-rabbit

tar c -C QA -zf tests-shi.tgz tests-shi etsy-emulator requirements.txt
tar c -C QA -zf health-check.tgz tests-shi/health_check tests-shi/modules tests-shi/pages requirements.txt

# cache production node_modules for later use
mv node_modules node_modules.prod
# restore the development node_modules (with dev-dependencies)
mv node_modules.develop node_modules
