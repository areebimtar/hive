#!/bin/bash

if [ $# -lt 3 ]
then
  echo "ERROR: test_wrapper.sh missing parameters!"
  echo "USAGE: test_wrapper.sh <working-dir> <search-path> <webpack-config> [output-file]"
  exit 1
fi

DIRNAME="$1"
SEARCHPATH="$2"
WEBPACK_CONFIG="$3"
OUTFILE="$4"

if [ "$WEBPACK_CONFIG" ]
then
  WEBPCAK_CONFIG_CMD="--webpack-config $WEBPACK_CONFIG"
else
  WEBPCAK_CONFIG_CMD=""
fi

cd "$DIRNAME"
if [ "$INCLUDE_DBSPEC" ]; then
    SPECFILES=$(find "$SEARCHPATH" -path '*.spec.js' -o -path '*.dbspec.js')
else
    SPECFILES=$(find "$SEARCHPATH" -path '*.spec.js')
fi

export BABEL_ENV=test
export NODE_ENV=test
export AUTH_DB_NAME=""

if [ "$CIRCLECI" ]
then
  if [ "$OUTFILE" ]
  then
    mocha-webpack $WEBPCAK_CONFIG_CMD --reporter mocha-junit-reporter --reporter-options mochaFile="$OUTFILE" --interactive false $SPECFILES
    RES=$?
  else
    mocha-webpack $WEBPCAK_CONFIG_CMD --reporter mocha-junit-reporter --interactive false $SPECFILES
    RES=$?
  fi
  if [ $RES -ne 0 ]
  then
    printf "\n\nERROR: unit test failed.\nRunning them with spec reporter.\n\n\n"
    mocha-webpack $WEBPCAK_CONFIG_CMD --reporter spec --interactive false $SPECFILES
  fi
  exit $RES
else
  mocha-webpack $WEBPCAK_CONFIG_CMD --reporter spec --interactive false $SPECFILES
  exit $?
fi
