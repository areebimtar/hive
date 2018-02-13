# /usr/bin/env python
import pytest
import os.path
import glob
from tests.base import BaseTestClass, DB_DIR, run_sql
from fixtures.fixtures import test_id


@pytest.mark.usefixtures("test_status", "test_id")
class TestDatabase(BaseTestClass):
    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)

    def test_listings_test_data_up_to_date(self):
        """ Test verifies that our listings test data were migrated (using script migrate-hivedb-data) with
        all migrations scripts for hive.
        Test compares contents of pgmigrations table for empty database and for all listings files.
        """
        # get list of migrations from freshly set-up DB
        migrations = run_sql('HIVE', 'select_migrations', True)

        files = glob.glob(os.path.join(DB_DIR, 'listings_*.sql'))
        if not files:
            raise Exception('No sql file found')

        # check that all listings files contain the same migrations as freshly set-up DB
        for filename in files:
            listings_name = os.path.splitext(os.path.basename(filename))[0]

            run_sql('HIVE', listings_name)
            listings_migrations = run_sql('HIVE', 'select_migrations', True)
            assert migrations == listings_migrations,\
                'Test data ' + listings_name + ' file is not migrated properly'

    def test_auth_data_up_to_date(self):
        """ Test verifies that our auth test data were migrated (using script migrate-hivedb-data) with
        all migrations scripts for hive.
        Test compares contents of pgmigrations table for empty database and for all auth files.
        """
        # get list of migrations from freshly set-up DB
        migrations = run_sql('AUTH', 'select_migrations', True)

        files = glob.glob(os.path.join(DB_DIR, 'auth_*.sql'))
        if not files:
            raise Exception('No sql file found')

        # check that all listings files contain the same migrations as freshly set-up DB
        for filename in files:
            auth_name = os.path.splitext(os.path.basename(filename))[0]

            run_sql('AUTH', auth_name)
            listings_migrations = run_sql('AUTH', 'select_migrations', True)
            assert migrations == listings_migrations,\
                'Test data ' + auth_name + ' file is not migrated properly'
