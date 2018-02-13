import pytest
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import click, wait_for_web_assert
from modules.rabbit import setup_rabbit
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from tests.variations import check_etsy_emulator_requests
from fixtures.fixtures import test_id
from flaky import flaky

LISTINGS_TO_CHECK = ['First something 1234', 'Second something 1235']


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestSectionAdd(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        setup_rabbit()
        self.set_etsy_testcase('listings_add_new_section')
        run_sql('HIVE', 'listings_02', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)

        mp = MainPage(self.driver)
        mp.get_main(self.base_url)
        mp.select_filter_tab('Active')
        mp.select_listings_to_edit(checked_listings=LISTINGS_TO_CHECK)

        bp = BulkPage(self.driver)
        click(bp.edit_part('Section'))

    # --- Tests ---

    def test_bulk_section_add(self):
        """ Tests adding a new section and setting it to listings using bulk operation
        """

        new_section_name = 'New section'

        expected_section_names = [new_section_name] * 2

        expected_api_calls = [{
            'POST': '/v2/shops/14458117/sections?title=New%20section',
            'body': {}
        }, {
            'PUT': '/v2/listings/100001',
            'body': {
                'listing_id': 100001,
                'shop_section_id': '66666666',
                'state': 'active'
            }
        }, {
            'PUT': '/v2/listings/100002',
            'body': {
                'listing_id': 100002,
                'shop_section_id': '66666666',
                'state': 'active'
            }
        }]

        bp = BulkPage(self.driver)
        bp.add_new_section(new_section_name)

        # Apply changes and check listings
        click(bp.operation_apply())
        assert bp.section_names() == expected_section_names

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - new section should be created and two listings updated
        check_etsy_emulator_requests(expected_api_calls)


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestSectionChanges(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        setup_rabbit()
        self.set_etsy_testcase('listings_02')
        run_sql('HIVE', 'listings_02', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)

        mp = MainPage(self.driver)
        mp.get_main(self.base_url)
        mp.select_filter_tab('Active')
        mp.select_listings_to_edit(checked_listings=LISTINGS_TO_CHECK)

        bp = BulkPage(self.driver)
        click(bp.edit_part('Section'))

        # --- Tests ---

    def test_bulk_section_change(self):
        """ Tests changing section on listings using bulk operation
        """

        expected_section_names = ['On Sale'] * 2

        expected_api_calls = [{
            'PUT': '/v2/listings/100001',
            'body': {
                'listing_id': 100001,
                'shop_section_id': '15183328',
                'state': 'active'
            }
        }, {
            'PUT': '/v2/listings/100002',
            'body': {
                'listing_id': 100002,
                'shop_section_id': '15183328',
                'state': 'active'
            }
        }]

        bp = BulkPage(self.driver)
        bp.select_section('On Sale')

        # Apply changes and check listings
        click(bp.operation_apply())
        assert bp.section_names() == expected_section_names

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - section should be changed on two listings
        check_etsy_emulator_requests(expected_api_calls)

    def test_bulk_section_remove(self):
        """ Tests removing section on listings using bulk operation
        """

        expected_section_names = ['Choose Section'] * 2

        expected_api_calls = [{
            'PUT': '/v2/listings/100001?shop_section_id=0',
            'body': {
                'listing_id': 100001,
                'state': 'active'
            }
        }, {
            'PUT': '/v2/listings/100002?shop_section_id=0',
            'body': {
                'listing_id': 100002,
                'state': 'active'
            }
        }]

        bp = BulkPage(self.driver)
        bp.select_section('None')

        # Apply changes and check listings
        click(bp.operation_apply())
        assert bp.section_names() == expected_section_names

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - section should be changed on two listings
        check_etsy_emulator_requests(expected_api_calls)

    def test_inline_section_change(self):
        """ Tests changing section directly on single listing
        """

        expected_section_names = ['Summer Sale', 'On Sale']

        expected_api_calls = [{
            'PUT': '/v2/listings/100002',
            'body': {
                'listing_id': 100002,
                'shop_section_id': '15183328',
                'state': 'active'
            }
        }]

        bp = BulkPage(self.driver)
        bp.select_single_section('Second something 1235', 'On Sale')

        # Check listings
        assert bp.section_names() == expected_section_names

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - section should be changed on one listing
        check_etsy_emulator_requests(expected_api_calls)

    def test_inline_section_remove(self):
        """ Tests removing section from a single listing
        """

        expected_section_names = ['Summer Sale', 'Choose Section']

        expected_api_calls = [{
            'PUT': '/v2/listings/100002?shop_section_id=0',
            'body': {
                'listing_id': 100002,
                'state': 'active'
            }
        }]

        bp = BulkPage(self.driver)
        bp.select_single_section('Second something 1235', 'None')

        # Check listings
        assert bp.section_names() == expected_section_names

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - section should be set to None on one listing
        check_etsy_emulator_requests(expected_api_calls)
