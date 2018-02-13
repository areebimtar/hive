# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql, HIVE_DATABASE_URL
from modules.testing import wait_for_assert
from modules.hivedb import HiveDatabase
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestEtsySections(BaseTestClass):

    # --- Tests ---

    def test_etsy_duplicate_sections(self):
        """ Test verifies the situation when section is defined in Etsy then user creates the
        same section in VELA and synces - section must not be duplicated in our DB, its etsy ID should be updated only.
        For more info see HIVE-996.
        """

        expected_db_data_queue = [
            ['1', 'syncShop', '2', 'done', '']
        ]

        expected_db_data_sections = [
            ['1', '2', '15183328', 'On Sale'],
            ['2', '2', '15180189', 'Holiday Gifts'],
            ['3', '2', '17365192', 'Summer Sale'],
            ['4', '2', '18790753', 'de'],
            ['5', '2', '18787742', 'bbbaa'],
            ['6', '2', '18790755', 'eeee']
        ]

        self.stop_all()
        self.set_etsy_testcase('listings_10')
        run_sql('HIVE', 'listings_10', retry=2)
        db = HiveDatabase(HIVE_DATABASE_URL)
        # set section etsy ID to NULL in test data
        # TODO: This should be reworked, section should be deleted from test data and created in UI as new
        db.change_section_etsy_id(None, 'eeee')
        self.restart_all()

        # check that sync task is done
        wait_for_assert(
            expected_db_data_queue,
            lambda: run_sql('HIVE', 'select_operations', True),
            'syncShop task was not completed as expected')

        # check that sections are synced correctly, there are no duplicates
        data = run_sql('HIVE', 'select_sections', True)
        assert data == expected_db_data_sections
