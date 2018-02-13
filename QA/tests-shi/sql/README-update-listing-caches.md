# Info
Files `listings_XX.sql` are cached DB data, if the DB structure changes, they need to be migrated or regenerated.

This README describes how to regenerate these files, for their migration see [README-hivedb-data-migration.md](README-hivedb-data-migration.md).


# When SQL data regeneratation is needed
When DB structure changes, a coresponding migration script is created in repo by developers. But for some cases the script may rely on the fact, that Hive imports data from external source (i.e. Etsy) - and in that case the migration just might throw away the old data and Hive would get the new data from that external source.

In that case it is not sufficent to migrate our test data using the migration, we also need to regenerate our DB test data using Etsy test data.

# How to regenerate the SQL data

Folow steps:

1. Build Hive using `qa-build`
2. Go to `QA/test-shi/tests-generate-data`
3. Run `./generate-sql-data` script

# How does it work

Script `generate-sql-data` runs "tests" in directory `QA/test-shi/tests-generate-data` using `shishito`

These "tests" serve as scripts for generating SQL DB data using Etsy test data (each test generates one SQL file) - the `generate-sql-data` script also supports `shishito` parameters, so for example only one SQL file can be generated if needed.

*Prerequisites* for these scripts is existing Etsy test data in the repo and Hive built using `qa-build`.
If Etsy data need to be refreshed, see script `QA/tests-shi/data/tools/generate_etsy_test_data.py`.

The flow of each "test" is:

  1. Start Hive with no shop imported
  2. Import a shop from Etsy emulator with particular Etsy test data
  3. Modify content of the DB as needed
  4. Dump the data into a listings SQL file

*Note:* these scripts use shishito because that way Hive can be controlled the same way as in ordinary tests
