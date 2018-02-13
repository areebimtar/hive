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


def select_listings_to_edit(driver, occasion=None):
    mp = MainPage(driver)
    bp = BulkPage(driver)

    mp.select_listings_to_edit(checked_listings='ALL')
    click(bp.edit_part('Occasion'))
    if occasion is not None:
        bp.select_occasion(occasion)


def check_db_state(expected_occasion):
    wait_for_assert(expected_occasion,
                    lambda: run_sql('HIVE', 'select_occasion', True),
                    'Occasion data in DB are incorrect')


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
class TestBulkOccasion(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        run_sql('HIVE', 'listings_14', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    # --- Tests ---

    def test_bulk_occasion_validation(self):
        """ Tests that occasion can't be set at all or changed on certain categories that don't permit it
        """

        expected_listings_01 = [
            'Four\nThe category of this listing does not support occasion',
            'One\nAnniversary',
            'Three\nChoose Occasion',
            'Two\nChoose Occasion'
        ]

        expected_listings_02 = [
            'Four\nThe category of this listing does not support occasion',
            'One\nGrief & Mourning',
            'Three\nChoose Occasion\nOccasion cannot be changed due to category',
            'Two\nChoose Occasion\nOccasion cannot be changed due to category'
        ]

        expected_listings_03 = [
            'Four\nThe category of this listing does not support occasion',
            'One\nGrief & Mourning',
            'Three\nChoose Occasion',
            'Two\nChoose Occasion'
        ]

        bp = BulkPage(self.driver)
        select_listings_to_edit(self.driver)

        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings_01

        # Change occasion using bulk
        bp.select_occasion('Grief & Mourning')

        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings_02

        # Apply changes and check listings
        click(bp.operation_apply())
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings_03

        # Check apply button
        wait_for_web_assert(False, bp.operation_apply().is_enabled, 'Apply button is enabled')


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

    def test_bulk_occasion_set(self):
        """ Tests setting occasion on listings using bulk
        """

        self.custom_setup('listings_push_attributes')

        expected_listings = [
            'Four\nThe category of this listing does not support occasion',
            'One\nBirthday',
            'Three\nChoose Occasion',
            'Two\nBirthday'
        ]

        expected_api_calls = [
            {'PUT': '/v2/listings/100001/attributes/46803063641?value_ids=19', 'body': {}},
            {'PUT': '/v2/listings/100002/attributes/46803063641?value_ids=19', 'body': {}}
        ]

        # Change occasion using bulk
        select_listings_to_edit(self.driver, 'Birthday')
        bp = BulkPage(self.driver)

        # Apply changes and check listings
        click(bp.operation_apply())
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Occasion') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Occasion') is False, 'Blue dot is still shown'

        # Check occasion data in Etsy requests
        check_etsy_emulator_requests(expected_api_calls)

    def test_bulk_occasion_delete(self):
        """ Tests deleting occasion from listings using bulk
        """

        self.custom_setup('listings_delete_occasion')

        expected_listings = [
            'Four\nThe category of this listing does not support occasion',
            'One\nChoose Occasion',
            'Three\nChoose Occasion',
            'Two\nChoose Occasion'
        ]

        expected_occasion_db = []

        expected_api_calls = [
            {'DELETE': '/v2/listings/100001/attributes/46803063641', 'body': {}}
        ]

        # Delete occasion using bulk
        select_listings_to_edit(self.driver, 'None')
        bp = BulkPage(self.driver)

        # Apply changes and check listings
        click(bp.operation_apply())
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Occasion') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Occasion') is False, 'Blue dot is still shown'

        # Check Etsy requests and occasion data in DB after resync
        check_etsy_emulator_requests(expected_api_calls)
        check_db_state(expected_occasion_db)

    def test_inline_occasion_change(self):
        """ Tests setting/changing of occasion on listings using inline edit
        """

        self.custom_setup('listings_push_attributes')

        expected_listings = [
            'Four\nThe category of this listing does not support occasion',
            'One\nEngagement',
            'Three\nChoose Occasion',
            'Two\nWedding'
        ]

        expected_api_calls = [
            {'PUT': '/v2/listings/100001/attributes/46803063641?value_ids=22', 'body': {}},
            {'PUT': '/v2/listings/100002/attributes/46803063641?value_ids=32', 'body': {}}
        ]

        select_listings_to_edit(self.driver)
        bp = BulkPage(self.driver)

        # Change occasion
        bp.select_single_occasion('One', 'Engagement')
        # Set occasion
        bp.select_single_occasion('Two', 'Wedding')

        # Check listings
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Occasion') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Occasion') is False, 'Blue dot is still shown'

        # Check occasion data in Etsy requests
        check_etsy_emulator_requests(expected_api_calls)

    def test_inline_occasion_delete(self):
        """ Tests deleting occasion from a listing using inline edit
        """

        self.custom_setup('listings_delete_occasion')

        expected_listings = [
            'Four\nThe category of this listing does not support occasion',
            'One\nChoose Occasion',
            'Three\nChoose Occasion',
            'Two\nChoose Occasion'
        ]

        expected_occasion_db = []

        expected_api_calls = [
            {'DELETE': '/v2/listings/100001/attributes/46803063641', 'body': {}}
        ]

        select_listings_to_edit(self.driver)
        bp = BulkPage(self.driver)

        # Delete occasion from listing
        bp.select_single_occasion('One', 'None')

        # Check listings
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Occasion') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Occasion') is False, 'Blue dot is still shown'

        # Check Etsy requests and occasion data in DB after resync
        check_etsy_emulator_requests(expected_api_calls)
        check_db_state(expected_occasion_db)
