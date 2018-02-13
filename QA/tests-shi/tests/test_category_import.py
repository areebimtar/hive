# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from modules.testing import wait_for_assert
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestCategoryImport(BaseTestClass):

    # --- Tests ---

    def test_import_taxonomy_id(self):
        """ Test verifies that taxonomy ID is correctly imported from Etsy (taxonomy_path or deprecated category_path
        are no longer used).
        Note: In API communication only taxonomy is used, but the text in UI is still called "Category".
        """

        expected_db_task_queue = [
            ['1', 'syncShop', '2', 'done', ''],
            ['2', 'downloadProduct', '1', 'done', '']
        ]

        expected_taxonomy_id = [['1', '2390']]

        self.stop_all()
        self.set_etsy_testcase('listings_sync_category')
        run_sql('HIVE', 'listings_10', retry=2)
        self.restart_all()
        # after restart the listing is synced from etsy emulator
        # with different taxonomy path than before

        # check that syncShop task and download product tasks are done
        wait_for_assert(
            expected_db_task_queue,
            lambda: run_sql('HIVE', 'select_operations', True),
            'syncShop task was not completed as expected')

        # check that taxonomy path and id were imported correctly
        taxonomy_id = run_sql('HIVE', 'select_taxonomy_id', True)
        assert taxonomy_id == expected_taxonomy_id

        #TODO it would be better to test more fields than just taxonomy_id - broader test
