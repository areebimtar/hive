# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import click, wait_for_web_assert
from modules.testing import wait_for_assert
from modules.rabbit import setup_rabbit
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from tests.etsy_emulator_support import EtsyEmulatorInterface
from fixtures.fixtures import test_id
from flaky import flaky


def select_listings_to_edit(driver, holiday=None):
    mp = MainPage(driver)
    bp = BulkPage(driver)

    mp.select_listings_to_edit(checked_listings='ALL')
    click(bp.edit_part('Holiday'))
    if holiday is not None:
        bp.select_holiday(holiday)


def check_db_state(expected_holiday):
    wait_for_assert(expected_holiday,
                    lambda: run_sql('HIVE', 'select_holiday', True),
                    'Holiday data in DB are incorrect')


def check_etsy_emulator_requests(expected_api_calls):
    emulator_interface = EtsyEmulatorInterface()

    # wait for the changes to synchronize to etsy (emulator)
    wait_for_assert(True,
                    lambda: len(emulator_interface.get_api_calls()) >= 8,
                    "Not enough calls made to Etsy emulator", retries=30)
    expected_db_shop_status = [['GetvelaTest2', 'up_to_date', 'f', '']]
    wait_for_assert(expected_db_shop_status, lambda: run_sql('HIVE', 'select_shop_status', True),
                    "Shop not synced", retries=30)

    # Check Etsy API calls
    emulator_interface.validate_api_calls(expected_api_calls,
                                          sort=True,
                                          normalize_func=emulator_interface.normalize_update_api_calls,
                                          message='Unexpected API requests')


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkOccasionSync(BaseTestClass):

    def custom_setup(self, etsy_testcase):

        self.stop_all()
        self.set_etsy_testcase(etsy_testcase)
        run_sql('HIVE', 'listings_14', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        setup_rabbit()
        self.restart_all()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    # --- Tests ---

    def test_bulk_holiday_set(self):
        """ Tests setting/changing holiday using bulk on listings
        """

        self.custom_setup('listings_push_attributes')

        expected_listings = [
            'Four\nThe category of this listing does not support holiday',
            'One\nChristmas',
            'Three\nChristmas',
            'Two\nChristmas'
        ]

        expected_api_calls = [
            {'PUT': '/v2/listings/100001/attributes/46803063659?value_ids=35', 'body': {}},
            {'PUT': '/v2/listings/100002/attributes/46803063659?value_ids=35', 'body': {}},
            {'PUT': '/v2/listings/100003/attributes/46803063659?value_ids=35', 'body': {}}
        ]

        # Set/change holiday using bulk
        select_listings_to_edit(self.driver, 'Christmas')
        bp = BulkPage(self.driver)

        # Apply changes and check listings
        click(bp.operation_apply())
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Holiday') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Holiday') is False, 'Blue dot is still shown'

        # Check holiday data in DB and Etsy requests
        check_etsy_emulator_requests(expected_api_calls)

    def test_bulk_holiday_delete(self):
        """ Tests deleting holiday from listings using bulk
        """

        self.custom_setup('listings_delete_holiday_bulk')

        expected_listings = [
            'Four\nThe category of this listing does not support holiday',
            'One\nChoose Holiday',
            'Three\nChoose Holiday',
            'Two\nChoose Holiday'
        ]

        expected_holiday_db = []

        expected_api_calls = [
            {'DELETE': '/v2/listings/100002/attributes/46803063659', 'body': {}},
            {'DELETE': '/v2/listings/100003/attributes/46803063659', 'body': {}}
        ]

        # Delete holiday from listings using bulk
        select_listings_to_edit(self.driver, 'None')
        bp = BulkPage(self.driver)

        # Apply changes and check listings
        click(bp.operation_apply())
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Holiday') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Holiday') is False, 'Blue dot is still shown'

        # Check Etsy requests and holiday data in DB after resync
        check_etsy_emulator_requests(expected_api_calls)
        check_db_state(expected_holiday_db)

    def test_inline_holiday_change(self):
        """ Tests setting/changing holiday on a listing using inline edit
        """

        self.custom_setup('listings_push_attributes')

        expected_listings = [
            'Four\nThe category of this listing does not support holiday',
            'One\nEaster',
            'Three\nVeterans\' Day',
            'Two\nFather\'s Day'
        ]

        expected_api_calls = [
            {'PUT': '/v2/listings/100001/attributes/46803063659?value_ids=37', 'body': {}},
            {'PUT': '/v2/listings/100002/attributes/46803063659?value_ids=38', 'body': {}},
            {'PUT': '/v2/listings/100003/attributes/46803063659?value_ids=49', 'body': {}}
        ]

        select_listings_to_edit(self.driver)
        bp = BulkPage(self.driver)

        # set holiday
        bp.select_single_holiday('One', 'Easter')
        # change holiday
        bp.select_single_holiday('Two', 'Father\'s Day')
        bp.select_single_holiday('Three', 'Veterans\' Day')

        # Check listings
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Holiday') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Holiday') is False, 'Blue dot is still shown'

        # Check holiday data in DB and Etsy requests
        check_etsy_emulator_requests(expected_api_calls)

    def test_inline_holiday_delete(self):
        """ Tests deleting holiday from a listing using inline edit
        """

        self.custom_setup('listings_delete_holiday_inline')

        expected_listings = [
            'Four\nThe category of this listing does not support holiday',
            'One\nChoose Holiday',
            'Three\nChinese New Year',
            'Two\nChoose Holiday'
        ]

        expected_holiday_db = [
            ['3', '{34}', 'f', 'f']
        ]

        expected_api_calls = [
            {'DELETE': '/v2/listings/100002/attributes/46803063659', 'body': {}}
        ]

        select_listings_to_edit(self.driver)
        bp = BulkPage(self.driver)

        # Delete holiday
        bp.select_single_holiday('Two', 'None')

        # Check listings
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Holiday') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Holiday') is False, 'Blue dot is still shown'

        # Check Etsy requests and holiday data in DB after resync
        check_etsy_emulator_requests(expected_api_calls)
        check_db_state(expected_holiday_db)
