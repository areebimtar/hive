#!/bin/bash

mkdir $CIRCLE_TEST_REPORTS/worker
mv worker/test-results.xml $CIRCLE_TEST_REPORTS/worker

mkdir $CIRCLE_TEST_REPORTS/test
mv test/test-results.xml $CIRCLE_TEST_REPORTS/test

mkdir $CIRCLE_TEST_REPORTS/server
mv auth/test-results.xml $CIRCLE_TEST_REPORTS/server/server.auth.tests.xml
mv web/test-results.xml $CIRCLE_TEST_REPORTS/server/server.web.tests.xml

mkdir $CIRCLE_TEST_REPORTS/client
mv auth/TESTS*.xml $CIRCLE_TEST_REPORTS/client/client.auth.tests.xml
mv web/TESTS*.xml $CIRCLE_TEST_REPORTS/client/client.web.tests.xml

mkdir $CIRCLE_TEST_REPORTS/manager
mv manager/test-results.xml $CIRCLE_TEST_REPORTS/manager

mkdir $CIRCLE_TEST_REPORTS/shared
mv shared/test-results.xml $CIRCLE_TEST_REPORTS/shared
