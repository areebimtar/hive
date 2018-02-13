#!/bin/bash
# Run health check on health-check machine

build_path=/srv/hive/current
export PYTHONPATH=$build_path/tests-shi
$build_path/venv/bin/python3 $build_path/tests-shi/health_check/health_check.py $*
killall chromedriver
killall chrome
