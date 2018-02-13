# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import click, wait_for_web_assert
from pages.main_page import MainPage
from pages.login_page import LoginPage
from fixtures.fixtures import test_id
from flaky import flaky

@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestOAuth(BaseTestClass):

    # --- Authorize (fake) Etsy, add a shop, download listings ---
    def test_add_shop_basic(self):

        expected_data = [
            ['100001',
             'VarTEST Tangle Free Headphones w/mic Earbuds, Custom Wrapped Match Your Phone Case iPhone 6 Plus 5 4 iPad iPod Android Smartphone Phone',
             'draft'],
            ['100002', 'Vartest TEST Sea Tangle Free Earbuds  iPhone Android Tablets iPod by MyBuds', 'draft'],
            ['100003', 'Vartest TEST SALE! Wild Berry Wrapped Earbuds  or EarPods for iPhone/Android', 'draft'],
            ['100006', 'MC Test Hand Built Ring Catchers The Perfect Party Favor for Your Next Event megha', 'inactive']
        ]

        self.set_etsy_testcase('listings_09')
        self.stop_all()
        run_sql('HIVE', 'listings_no_shop', retry=2)
        self.restart_all()
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        lpg.go_to_etsy()

        lpg.wait_during_sync_from_etsy()

        d = self.driver
        pg = MainPage(d)

        # check the menu contais the shop
        channel_button = pg.channel_button()
        click(channel_button)
        wait_for_web_assert('ETSYGetvelaTest2', lambda: channel_button.text)

        menu_items = d.find_elements_by_css_selector('div.shops-menu li')
        assert len(menu_items) == 1

        assert (menu_items[0].is_displayed())
        
        shop_names = [t.text for t in menu_items]
        assert shop_names == ['GetvelaTest2']

        # number of listings  ['Active', 'Draft', 'Inactive'], Note: expired listings are not imported
        listing_counts_by_status = [t.text for t in pg.filter_tabs_counts()]
        assert listing_counts_by_status == ['0', '3', '1']

        # Check imported listings - basic data
        data = run_sql('HIVE', 'select_product_short_info', True)
        assert data == expected_data, 'Unexpected product data in DB'
