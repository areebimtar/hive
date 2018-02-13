import pytest
from tests.base import BaseTestClass, run_sql
from pages.login_page import LoginPage
from pages.main_page import MainPage
from fixtures.fixtures import test_id
from flaky import flaky

ACTIVE_TITLE = 'First something 1234'
DRAFT_TITLE = 'VarTEST Tangle Free Headphones w/mic Earbuds, Custom Wrapped Match Your Phone Case iPhone 6 Plus 5 4 iPad iPod Android Smartphone Phone'
INACTIVE_TITLE = 'MC Test Hand Built Ring Catchers The Perfect Party Favor for Your Next Event megha'


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestMainPageListingsView(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        self.set_etsy_testcase('tc1')

    def test_main_active_listing_data(self):
        """ Test verifies that all data of an active listing are displayed correctly on the main page
        """

        expected_listings_texts = [ACTIVE_TITLE, '1', '$5.15', '1/1/18', 'Summer Sale']

        run_sql('HIVE', 'listings_02', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)

        mp = MainPage(self.driver)
        mp.get_main(self.base_url)

        mp.select_filter_tab('Active')

        listing_texts = mp.listing_texts(ACTIVE_TITLE)
        assert listing_texts == expected_listings_texts

    def test_main_draft_inactive_listing_data(self):
        """ Test verifies that:
            - all data of a draft listing are displayed correctly on the main page
            - all data of an inactive listing are displayed correctly on the main page
        """

        expected_listings_texts_draft = [DRAFT_TITLE, '65', '$95.00', '1/1/17', 'Summer Sale']
        expected_listings_texts_inactive = [INACTIVE_TITLE, '65', '$95.00', '1/5/18', 'Summer Sale']

        run_sql('HIVE', 'listings_09', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)

        mp = MainPage(self.driver)
        mp.get_main(self.base_url)

        # --- check Draft listings ---

        mp.select_filter_tab('Draft')

        listing_texts = mp.listing_texts(DRAFT_TITLE)
        assert listing_texts == expected_listings_texts_draft

        # --- check Inactive listings ---

        mp.select_filter_tab('Inactive')
        listing_texts = mp.listing_texts(INACTIVE_TITLE)
        assert listing_texts == expected_listings_texts_inactive
