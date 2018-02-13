# /usr/bin/env python
import pytest
from pages.main_page import MainPage
from pages.login_page import LoginPage
from tests.base import BaseTestClass, run_sql
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestMainPage(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        # we can afford to load data to DB once, DB is not changed in tests in this class
        run_sql('HIVE', 'listings_09', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

    # --- Tests ---

    @pytest.mark.smoke
    def test_title(self):
        """ Test page title
        """
        d = self.driver

        d.get(self.base_url)
        assert d.title == 'Vela'

    def test_listings_loaded(self):
        """ Ensure correct data is displayed
        """
        expected_titles = [
            'VarTEST Tangle Free Headphones w/mic Earbuds, Custom Wrapped Match Your Phone Case iPhone 6 Plus 5 4 iPad iPod Android Smartphone Phone',
            'Vartest TEST SALE! Wild Berry Wrapped Earbuds or EarPods for iPhone/Android',
            'Vartest TEST Sea Tangle Free Earbuds iPhone Android Tablets iPod by MyBuds'
        ]

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)

        # click on Draft
        pg.select_filter_tab('Draft')
        pg.wait_for_listings()

        actual_titles = pg.listing_titles_sorted()
        assert actual_titles == expected_titles
