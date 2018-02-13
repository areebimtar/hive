import pytest
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from modules.rabbit import setup_rabbit
from tests.etsy_emulator_support import EtsyEmulatorInterface
import tests.vela_control as vela
from pages.bulk_page import BulkPage
from pages.main_page import MainPage
from pages.login_page import LoginPage
from fixtures.fixtures import test_id, rabbit_init
from flaky import flaky


def get_etsy_emulator_requests():
    emulator_interface = EtsyEmulatorInterface()

    # Get Etsy API calls
    return emulator_interface.get_normalized_api_calls(sort=True,
                                                       normalize_func=emulator_interface.normalize_update_api_calls)


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestSyncEtsy(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        setup_rabbit()
        run_sql('HIVE', 'listings_14', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        pg = MainPage(self.driver)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    def test_sync_shop_bill_overdue(self):
        """ Tests verifies VELA behaviour when shop bill is overdue on Etsy.
        In that case update of a listing to Etsy fails.
        Test verifies that listing update is sent again during the next shop sync.
        """

        self.set_etsy_testcase('listings_push_listings_bill_overdue')

        expected_put_request = {
            'PUT': '/v2/listings/100001',
            'body': {'state': 'active', 'listing_id': 100001, 'title': 'One modified'}
        }

        bp = BulkPage(self.driver)
        mp = MainPage(self.driver)
        mp.select_listings_to_edit(checked_listings='ALL')

        # change title of one listing
        bp.set_single_title('One', 'One modified')

        # Sync changes
        click(bp.sync_updates_button())

        # Wait for shop to sync and get etsy requests
        vela.wait_for_shop_to_sync(expected_status='incomplete')
        etsy_requests = get_etsy_emulator_requests()

        # Trigger shop sync again, wait for sync to finish and get etsy requests again
        last_sync_time = vela.get_shop_last_sync_time()
        vela.trigger_etsy_shop_sync(2, 2)
        vela.wait_for_shop_to_sync(last_sync_time=last_sync_time)
        etsy_requests2 = get_etsy_emulator_requests()

        # Check that all PUT requests to Etsy contain the same update of the listing
        for i, etsy_request in enumerate(etsy_requests2):
            assert etsy_request == expected_put_request, 'Unexpected PUT request number %d' % (i + 1)
        # Check that VELA tried to send the listing to Etsy more than once during the first shopSync
        assert len(etsy_requests) > 1
        # Check that during the second sync changes of the listing were sent to Etsy again
        assert len(etsy_requests2) > len(etsy_requests)

    def test_sync_listing_state_changed(self):
        """ Test verifies that listing changes are uploaded also if their state changes on Etsy - and that the change is
            uploaded with correct listing state
        """

        expected_api_calls = [{
            'PUT': '/v2/listings/100001',
            'body': {
                'listing_id': 100001,
                'state': 'active',
                'title': 'prefix One'
            }
        }, {
            'PUT': '/v2/listings/100002',
            'body': {
                'listing_id': 100002,
                'state': 'active',
                'title': 'prefix Two'
            }
        }, {
            'PUT': '/v2/listings/100003',
            'body': {
                'listing_id': 100003,
                'state': 'draft',
                'title': 'prefix Three'
            }
        }, {
            'PUT': '/v2/listings/100004',
            'body': {
                'listing_id': 100004,
                'state': 'draft',
                'title': 'prefix Four'
            }
        }]

        self.set_etsy_testcase('listings_state_change')

        bp = BulkPage(self.driver)
        mp = MainPage(self.driver)
        mp.select_listings_to_edit(checked_listings='ALL')

        # change titles of all listings
        input_field = bp.operation_input()
        send_keys(input_field, 'prefix ')

        # click on Apply and check Apply button
        click(bp.operation_apply())
        wait_for_web_assert(False, bp.operation_apply().is_enabled, 'Apply button is enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # wait for sync button to be disabled (sync is in progress)
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Wait for shop to sync and then get etsy requests
        vela.wait_for_shop_to_sync(expected_status='up_to_date')
        etsy_requests = get_etsy_emulator_requests()

        assert etsy_requests == expected_api_calls


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestSyncEtsy2(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        setup_rabbit()
        run_sql('HIVE', 'listings_02', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        pg = MainPage(self.driver)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    def test_sync_invalid_listing_states(self):
        """ Test verifies that when updating listings
            - listings with invalid state on Etsy are deleted
            - updates of listings with invalid state on Etsy are not sent to Etsy
        """

        expected_listing_titles = ['prefix Sixth something']

        expected_api_calls = [{
            'PUT': '/v2/listings/100006',
            'body': {
                'listing_id': 100006,
                'state': 'active',
                'title': 'prefix Sixth something'
            }
        }]

        self.set_etsy_testcase('listings_invalid_states')

        bp = BulkPage(self.driver)
        mp = MainPage(self.driver)
        mp.select_listings_to_edit(checked_listings='ALL')

        # change titles of all listings
        input_field = bp.operation_input()
        send_keys(input_field, 'prefix ')

        # click on Apply and wait for sync button to be enabled
        click(bp.operation_apply())
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is disabled')

        # Sync changes
        click(bp.sync_updates_button())

        # wait for sync button to be disabled (sync is in progress)
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Wait for shop to sync and then get etsy requests
        vela.wait_for_shop_to_sync(expected_status='up_to_date')
        etsy_requests = get_etsy_emulator_requests()

        # Check etsy requests - only sixth listing is updated
        assert etsy_requests == expected_api_calls

        # Close bulk editor and check listing titles in main page UI
        # - only one listing with valid state should be displayed - others were deleted
        bp.close_bulk_edit()
        wait_for_web_assert(expected_listing_titles, mp.listing_titles_sorted, 'Unexpected listing titles')
