# /usr/bin/env python
import pytest
from time import sleep
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import click
from pages.main_page import MainPage
from pages.bulk_page import BulkPage
from pages.login_page import LoginPage
from fixtures.fixtures import test_id
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestPagination(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.set_etsy_testcase(self, 'tc1')
        self.stop_all(self)
        # we can afford to load data to DB once, DB is not changed in tests in this class
        run_sql('HIVE', 'listings_03', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

    # --- Tests ---

    def test_pagination_buttons_main_page(self):
        """ Tests the paging cannot go beyond end
        """

        d = self.driver
        pg = MainPage(d)

        pg.wait_for_listings()

        # check that correct number of listings is displayed after opening the main page
        listing_titles = pg.listing_titles_sorted()
        assert len(listing_titles) == 25, 'Incorrect number of listings displayed'

        prev_page = pg.prev_page_button()
        assert prev_page.is_displayed() is False

        next_page = pg.next_page_button()
        assert next_page.text == 'Show 1 - 51 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.text == 'Show 26 - 76 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.text == 'Show 51 - 101 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.text == 'Show 76 - 102 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.is_displayed() is False

        prev_page = pg.prev_page_button()
        assert prev_page.text == 'Show 51 - 101 of 102'

        click(prev_page)
        sleep(2)
        prev_page = pg.prev_page_button()
        assert prev_page.text == 'Show 26 - 76 of 102'

        click(prev_page)
        sleep(2)
        prev_page = pg.prev_page_button()
        assert prev_page.text == 'Show 1 - 51 of 102'

        click(prev_page)
        sleep(2)
        prev_page = pg.prev_page_button()
        assert prev_page.is_displayed() is False

        next_page = pg.next_page_button()
        assert next_page.text == 'Show 26 - 76 of 102'

    def test_pagination_buttons_bulk_page(self):
        """ Tests the paging cannot go beyond end
        """

        d = self.driver
        mp = MainPage(d)
        pg = BulkPage(d)
        mp.select_listings_to_edit('ALL')

        # Following part is exactly the same as for the MainPage,
        # but it uses controls that are defined in BulkPage
        prev_page = pg.prev_page_button()
        assert prev_page.is_displayed() is False

        next_page = pg.next_page_button()
        assert next_page.text == 'Show 1 - 51 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.text == 'Show 26 - 76 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.text == 'Show 51 - 101 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.text == 'Show 76 - 102 of 102'

        click(next_page)
        sleep(2)
        next_page = pg.next_page_button()
        assert next_page.is_displayed() is False

        prev_page = pg.prev_page_button()
        assert prev_page.text == 'Show 51 - 101 of 102'

        click(prev_page)
        sleep(2)
        prev_page = pg.prev_page_button()
        assert prev_page.text == 'Show 26 - 76 of 102'

        click(prev_page)
        sleep(2)
        prev_page = pg.prev_page_button()
        assert prev_page.text == 'Show 1 - 51 of 102'

        click(prev_page)
        sleep(2)
        prev_page = pg.prev_page_button()
        assert prev_page.is_displayed() is False

        next_page = pg.next_page_button()
        assert next_page.text == 'Show 26 - 76 of 102'
