# Mocha "Between" Tests

Until we find a better name, I'm dubbing the concept of a "between" test. This is a test that is somewhere between a unit test
and a full integration test.

An example of a between test is something that tests from the level of getting a JSON payload from Etsy to transformation into
our model objects or vice versa.

In these tests, we mock the http communication with Etsy and use a real database. This approach has some benefits that are
tricky to achieve with unit tests alone, for example:

1. SQL statements get tested along with the rest of the model code.
2. Setup for some complicated scenarios is simplier because real-world examples can be used as fixtures (e.g. just check in a real
json payload from etsy, then import and test assumptions).

There are various fixtures and utilities for these tests in this directory, but dbspec tests can be put anywhere in the
codebase.

As a preparation step, these tests set up empty app and auth databases with the latest schema. Test data is created as
needed by the tests themselves (i.e. no pre-populated data is checked in).

## What is real and what is mocked?

* Real: These tests use a real postgres database with the migrations run on them.
* Real: These tests use the model objects almost exclusively for accessing the database (i.e. there
are no database fixtures to load in... the tests create accounts and shops via the models)
* Mocked: We don't make actual API calls to etsy. Instead, tests set up what they want an etsy response
to look like and configure this as a part of a test's setup.
* Real: The ApiClient that we use in production to call Etsy is still used, only the http requests
are mocked using the nock library

## How slow/flaky is it?

Very fast, very reliable.

By default, when running a dbspec test run, a new database will get created at the beginning and destroyed at the end
of the run. This takes under 10 seconds so it's no big deal if you're running all the tests (that 10 seconds only happens once).
However, if you're working on a single test and running it over and over again, this seems slow, so there's a way
to tell the test runner to reuse a fixed-name database-- only create it if it doesn't exist and don't delete it
at the end.... then things seems to run just as fast as non-db related tests.

The only flakiness I've seen is that if you're using the same db for many runs and you have a test failure, sometimes
you get bad data in your database.


## What kinds of tests can you write?

Here's what's already being done:
* **Models** it's easy to call the methods on models directly. See samples/sampleModelTest.dbspec.js for a
very basic example
* **Operation Handlers** Downloads are very easy-- you just check in a fixture that represents the results you'd
get from Etsy and use the real database. Look at samples/sampleOperationHandlerTest.dbspec.js.  It runs the
downloadProduct operation handler then uses the models to retrieve the product from the db and verify some properties.
* **Listing-to-product and product-to-listing** Although we have reasonable unit testing on some of this, putting
persistence into the mix makes sodme more complex input/transform/output scenarios easier to create and will catch
issues at the persistence layer (e.g. trying to insert wrong data types, etc).
* **Our API below the surface** With what we have today, we can easily test the web/server/api functionality below the express layer. For example, the test coverage
of something like web/src/server/api/shops/products/getProduct.js is pretty limited. We could import a complex listing from
a fixture, then request it via this function and ensure that it has what the client expects


## How to run the tests
**Prerequisite** you need postgres running locally and you need to run the tests as a superuser who has the
rights to create new roles & databases and who can connect to the postgresdb.

The tests are run via the regular test_wrapper.sh and are wired in through our yarn
scripts. However, they only run if you have INCLUDE_DBSPEC defined. Right now, there
are files like this in the worker and test directories, so you can run those with these
commands

    INCLUDE_DBSPEC=true yarn run test_worker_backend
    INCLUDE_DBSPEC=true yarn run test_test

If you want to use the same database over and over again, specify a name you want in HIVE_TEST_DB_NAME
(you do NOT need to create this database-- the tests will check if it exists and create it on demand).

so, for example:

    HIVE_TEST_DB_NAME=boons_test_db INCLUDE_DBSPEC=true yarn run test_worker_backend

The first time you run it, you'll see the database getting created but on subsequent runs, the existing db will
be used and it will run faster.

These tests run by default on CircleCI.

## To Do
* The use of global and app in module imports is not compatible with the way we run
tests-- so we either need to switch to relative paths or figure out how to get these global
values into the tests.
* The library of sample Etsy API responses is pretty limited-- the fixtures library could be extended
with more data and utility functions.