# QA regression test suite and End-to-end test with real Etsy using Virtual machine

If testing environment is set up corectly on local machine, it is possible to run tests locally directly as described in [QA regression test-suite](#qa-regression-test-suite) and [QA E2E test-suite](#qa-e2e-test-suite). In that case all actions on VM would happen locally.

The other option is to use prefabricated virtual machine `Boonbox` - which is described in this memo.

## Boonbox
VirtualBox appliance can be downloaded from: <https://drive.google.com/a/salsitasoft.com/file/d/0B-JEJ5RSLBYPaWNmSm9YT2R5SlU/view?usp=sharing>

Use VirtualBox `File/Import Appliance...` menu to import it.


## QA regression test-suite
All configuration should be in place, when needed to switch git branch, just stash local changes and restore them once the chosen branch is there.
Running tests:

1. `~/Salsita/hive/QA/tests-shi/qa-build`
2. `grid` #to start selenium
3. `~/Salsita/hive/QA/tests-shi/qa-test [--test <test_id>]`

## QA E2E test-suite

### Pre-requisities
A dev one-box is required running the branch that needs to be tested.
Postgres db needs to be available from the VM image.

#### Making one-box's Postgres and RabbitMQ reachable from VM
On the one-box:

1. edit file `/etc/postgresql/<version>/main/pg_hba.conf`
2. make sure the *hive* and *hive_auth* dbs have correct address:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    hive            hive            0.0.0.0/0               md5
host    hive_auth       hive            0.0.0.0/0               md5
```
3. edit file `/etc/postgresql/<version>/main/postgresql.conf`
4. make sure that `listen_address` is setup correctly
```
listen_addresses = '*'
```
5. check in AWS console the one-box was assigned a `Security Group` that allows Postgres and RabbitMQ port, and has `KeyName` _VelaNonProductionKey_

#### Placing scripts on the one-box
On one-box itself, runnable scripts `rm-logs` and `grep-logs` need to be placed in home directory, example implementation can be found on the VM image:

* `~/Salsita/rm-logs`
* `~/Salsita/grep-logs`

#### Magic flags
There is no need to set up magic flags, currently, the E2E test resets feature flags of beta features to test the behaviour that will appear in production.

*Note:* beta feature flags are hardcoded in test for the moment.


#### Setting Shipping profile
The shop intended for usage in E2E tests needs to have setup `Shipping profile` on Etsy, <https://www.etsy.com/your/shops/__etsy_shop_name__/tools/shipping-profiles>

The shipping profile's name needs to be `Default`, with cost of shippings set to `0` and country set to `United States`

#### Setup E2E config
On VM the connection to the one-box needs to be setup:

1. `cd ~/Salsita/hive/QA/tests-shi/tests-etsy`
2. `cp test.cfg-example test.cfg`
3. edit `test.cfg`

### Running E2E tests

1. Checkout `develop` branch and pull the latest changes
2. Run `grid` to start selenium
3. Run `~/Salsita/hive/QA/tests-shi/tests-etsy/run-etsy-test`