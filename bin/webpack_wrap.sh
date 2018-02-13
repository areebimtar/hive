#!/bin/bash

# takes one argument (webpack configuration file) and invokes webpack build
# patches NODE_ENV for builds on CircleCI, where it sets it to "production",
# otherwise uses actual value.

set -e
[ $# != 1 ] && echo "ERROR::webpack_wrap.sh: expected 1 argument, got $#" && exit 1


CI_ENV=${NODE_ENV}
[ "$CI" ] && CI_ENV="production"

NODE_ENV=${CI_ENV} node --max_old_space_size=8192 node_modules/webpack/bin/webpack.js --config "${1}" --bail
