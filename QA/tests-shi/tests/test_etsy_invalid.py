# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from modules.testing import wait_for_assert
from modules.rabbit import setup_rabbit
from pages.login_page import LoginPage
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestEtsyInvalid(BaseTestClass):

    # --- Tests ---

    def test_etsy_missing_title(self):
        """ Test verifies, that invalid data from Etsy - missing title - don't cause syncShop task to be suspended.
            See HIVE-845 for more info """

        expected_db_task_queue = [
            ['1', 'syncShop', '2', 'done', ''],
            ['2', 'downloadProduct', '1', 'done', '']
        ]

        expected_db_product_properties = [
            ['1', '2', 't', 'Title cannot be empty']
        ]

        self.stop_all()
        self.set_etsy_testcase('listings_missing_title')
        run_sql('HIVE', 'listings_10', retry=2)
        setup_rabbit()
        self.restart_all()

        # check that sync task is done
        wait_for_assert(
            expected_db_task_queue,
            lambda: run_sql('HIVE', 'select_operations', True),
            'syncShop task was not completed as expected')

        # check that product was marked as invalid and check the reason why
        data_db_product_properties = run_sql('HIVE', 'select_product_properties', True)
        assert expected_db_product_properties == data_db_product_properties

    def test_etsy_invalid_section(self):
        """ Test verifies, that invalid data from Etsy - null title in section - don't cause syncShop
            task to be failed.
            See HIVE-934 for more info.
        """

        expected_db_data = [
            ['1', 'syncShop', '2', 'done', ''],
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
        self.set_etsy_testcase('listings_invalid_section')
        run_sql('HIVE', 'listings_10', retry=2)
        setup_rabbit()
        self.restart_all()

        # check that sync task is done
        wait_for_assert(
            expected_db_data,
            lambda: run_sql('HIVE', 'select_operations', True),
            'syncShop task was not completed as expected')

        # check that sections are synced correctly - invalid section is ignored
        data = run_sql('HIVE', 'select_sections', True)
        assert data == expected_db_data_sections

    def test_etsy_listing_unavailable(self):
        """ Test verifies that shopSync task finishes correctly when a listing has status 'unavailable'.
            Such a listing does not contain all fields that listing should contain, i.e. title, price, quantity,
            therefore it is marked as invalid.
            See HIVE-1038 and HIVE-1046 for more info """

        expected_db_task_queue = [
            ['1', 'syncShop', '2', 'done', ''],
            ['2', 'downloadProduct', '1', 'done', '']
        ]

        expected_db_product_properties = [
            ['1', '2', 't', 'Unsupported listing state: unavailable']
        ]

        self.stop_all()
        self.set_etsy_testcase('listings_status_unavailable')
        run_sql('HIVE', 'listings_10', retry=2)
        setup_rabbit()
        self.restart_all()

        # check that sync task is done
        wait_for_assert(
            expected_db_task_queue,
            lambda: run_sql('HIVE', 'select_operations', True),
            'syncShop task was not completed as expected')

        # check that product was marked as invalid and check the reason why
        data_db_product_properties = run_sql('HIVE', 'select_product_properties', True)
        assert expected_db_product_properties == data_db_product_properties

    def test_etsy_null_character(self):
        """ Test verifies that listing is successfully imported when it has null character in description.
            Null character is ignored during import - see HIVE-1477
        """

        expected_descriptions = [
            'Description with null character',
            'Description without null character'
        ]

        self.set_etsy_testcase('listings_null_character')
        self.stop_all()
        run_sql('HIVE', 'listings_no_shop', retry=2)
        setup_rabbit()
        self.restart_all()

        # login and import shop
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)
        lpg.go_to_etsy()

        lpg.wait_during_sync_from_etsy()

        # check that two listings were imported
        db_data = run_sql('HIVE', 'select_description', True)
        assert len(db_data) == 2, 'Unexpected count of successfully imported listings'

        # check that descriptions were correctly imported for both listings
        descriptions = sorted([row[0] for row in db_data])
        assert descriptions == expected_descriptions, 'Unexpected descriptions of listings'
