#!/bin/bash

# generates build information either from CircleCI variables, or takes the data
# from git commands. prints the data in JSON format to standard output.

set -e

# build number
A=$CIRCLE_BUILD_NUM
[ -z "$A" ] && A="local"

# build branch
B=$CIRCLE_BRANCH
[ -z "$B" ] && B=`git rev-parse --abbrev-ref HEAD 2>/dev/null`
[ -z "$B" ] && B="n/a"

# build commit hash
C=$CIRCLE_SHA1
[ -z "$C" ] && C=`git rev-parse HEAD 2>/dev/null`
[ -z "$C" ] && C="n/a"

# build time
D=`date +"%Y-%m-%d %T"`

# output
echo "{ \"CCIBuildNumber\": \"$A\", \"GHBranch\": \"$B\", \"GHCommit\": \"$C\", \"timestamp\": \"$D\" }"
