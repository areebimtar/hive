# /usr/bin/env python
import pytest
from unittestzero import Assert
from shishito.runtime.shishito_support import ShishitoSupport
from shishito.ui.selenium_support import SeleniumTest
from shishito.conf.conftest import get_test_info
from selenium.webdriver.support import expected_conditions as cond
from time import sleep
from tests.base import BaseTestClass, InventorySupport, run_sql
from modules.selenium_tools import click
from selenium.webdriver.common.by import By
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from fixtures.fixtures import test_id
from flaky import flaky

@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestListingSelection(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        # as the DB is not changed in tests we can afford to fill it only once
        run_sql('HIVE', "listings_03", retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)


    ### Tests ###


    # --------------------------------------------------------------------------------
    def test_select_listings(self):
        """ Tests that the listing selection persists across pages
        """

        d = self.driver
        pg = MainPage(d)

        expected_listings = [
            'Fifth something (11)',
            'Fifth something (17)',
            'Fifth something (23)',
            'Fifth something (5)',
            'First something 1234 (1)',
            'First something 1234 (13)',
            'First something 1234 (19)',
            'First something 1234 (25)',
            'First something 1234 (7)',
            'Forth something 123456 (10)',
            'Forth something 123456 (16)',
            'Forth something 123456 (22)',
            'Forth something 123456 (4)',
            'Second something 1235 (14)',
            'Second something 1235 (2)',
            'Second something 1235 (20)',
            'Second something 1235 (8)',
            'Sixth something (12)',
            'Sixth something (18)',
            'Sixth something (24)',
            'Sixth something (6)',
            'Third something LG-512a (15)',
            'Third something LG-512a (21)',
            'Third something LG-512a (3)',
            'Third something LG-512a (9)'
        ]
        checked_listings_page_1 = [
            'First something 1234 (1)',
            'Forth something 123456 (4)',
            'Fifth something (5)',
        ]
        checked_listings_page_3 = [
            'Sixth something (42)',
            'First something 1234 (43)',
        ]

        #pg.filter_tab('Active').click()
        #sleep(1)

        listing_titles = sorted(pg.listing_titles_sorted())
        print(listing_titles)
        assert listing_titles == expected_listings

            # check checkboxes page 1 [checked_listings_page_1]
        listing_rows = pg.listing_rows()
        listings_to_select = [r for r in listing_rows if r.find_element_by_css_selector('div.table-row-column div.title').text in checked_listings_page_1]
        for listing_row in listings_to_select:
            click(listing_row)

            # next 2 pages
        next_page_button = pg.next_page_button()
        click(next_page_button)
        sleep(1)
        click(next_page_button)
        sleep(1)

            # check checkboxes page 3 [checked_listings_page_3]
        listing_rows = pg.listing_rows()
        listings_to_select = [r for r in listing_rows if r.find_element_by_css_selector('div.table-row-column div.title').text in checked_listings_page_3]
        for listing_row in listings_to_select:
            click(listing_row)

        edit_listings_button = pg.edit_listings_button()
        assert edit_listings_button.text == 'Edit 5 Listings'

            # back 2 pages
        click(pg.prev_page_button())
        sleep(1)


# check the boxes are checked
        listing_rows = pg.listing_rows()
        listings_selected = [r for r in listing_rows if r.find_element_by_css_selector('div.table-row-column div.title').text in checked_listings_page_1]

        for listing_row in listings_selected:
            row_class = listing_row.get_attribute('class')
            assert 'selected' in row_class.split(' ')



    # --------------------------------------------------------------------------------
    def test_select_all_listings(self):
        """ Tests that the select-all checkbox works
        """
        d = self.driver
        pg = MainPage(d)

        checked_listings_page_1 = [
            'First something 1234 (1)',
            'Forth something 123456 (4)',
            'Fifth something (5)',
        ]

        cb_all = pg.listing_select_all_checkbox()
        click(cb_all)
        sleep(2)

        assert pg.edit_listings_button().text == 'Edit 102 Listings'

            # un-check checkboxes page 1 [checked_listings_page_1]
        listing_rows = pg.listing_rows()
        listings_to_select = [r for r in listing_rows if r.find_element_by_css_selector('div.table-row-column div.title').text in checked_listings_page_1]
        for listing_row in listings_to_select:
            click(listing_row)

        assert pg.edit_listings_button().text == 'Edit 99 Listings'

            # select all
        click(cb_all)
        sleep(1)
        assert pg.edit_listings_button().text == 'Edit 102 Listings'

            # de-select all
        click(cb_all)
        sleep(1)
        assert pg.edit_listings_button().text == 'Edit'


    # --------------------------------------------------------------------------------
    def test_selection_clear_tabs(self):
        """ Tests that the selection is reset when you change filter tabs
        """
        d = self.driver
        pg = MainPage(d)

            # select all
        cb_all = pg.listing_select_all_checkbox()
        click(cb_all)
        sleep(2)
        assert pg.edit_listings_button().text == 'Edit 102 Listings'

            # switch to Draft & back
        pg.select_filter_tab('Draft')
        sleep(1)
        pg.select_filter_tab('Active')
        sleep(1)

            # check that no checkboxes are checked
        assert pg.edit_listings_button().text == 'Edit'
        listing_rows = pg.listing_rows()
        for listing_row in listing_rows:
            row_class = listing_row.get_attribute('class')
            assert 'selected' not in row_class.split(' ')


    # --------------------------------------------------------------------------------
    def test_selection_clear_filters(self):
        """ Tests that the selection is reset when you change filters
        """
        d = self.driver
        pg = MainPage(d)

        pg.select_filter_tab('Active')
        sleep(1)

            # select all
        cb_all = pg.listing_select_all_checkbox()
        click(cb_all)
        sleep(2)
        assert pg.edit_listings_button().text == 'Edit 102 Listings'

            # Click a filter checkbox
        cb = pg.filter_checkbox('CATEGORIES', 'Clothing')
        click(cb)
        sleep(2)

            # check that no checkboxes are checked
        assert pg.edit_listings_button().text == 'Edit'
        listing_rows = pg.listing_rows()
        for listing_row in listing_rows:
            row_class = listing_row.get_attribute('class')
            assert 'selected' not in row_class.split(' ')   # ! selected



    # --------------------------------------------------------------------------------
    def test_bulk_edit_view_listings_base(self):
        """ Tests that the bulk edit view shows the listings
        """
        d = self.driver
        pg = MainPage(d)
        bp = BulkPage(d)

        checked_listings_page_1 = [
            'Fifth something (5)',
            'First something 1234 (1)',
            'Forth something 123456 (4)',
        ]
        bulk_listings_page_1 = [
            'Fifth something (5)\n121 characters remaining',
            'First something 1234 (1)\n116 characters remaining',
            'Forth something 123456 (4)\n114 characters remaining'
        ]

        pg.select_filter_tab('Active')
        sleep(1)

            # check checkboxes page 1 [checked_listings_page_1]
        listing_rows = pg.listing_rows()
        listings_to_select = [r for r in listing_rows if r.find_element_by_css_selector('div.table-row-column div.title').text in checked_listings_page_1]
        for listing_row in listings_to_select:
            click(listing_row)

            # click the Edit Listings
        edit_listings_button = pg.edit_listings_button()
        click(edit_listings_button)
        sleep(1)

            # check the listings
        listing_titles = bp.listing_rows_texts_sorted()
        assert listing_titles == bulk_listings_page_1


    # --------------------------------------------------------------------------------
    def test_bulk_edit_view_listings_checked(self):
        """ Tests that the bulk edit view shows the listings checked on all pages
        """
        d = self.driver
        pg = MainPage(d)
        bp = BulkPage(d)

        pg.select_filter_tab('Active')
        sleep(1)

            # check all
        click(pg.listing_select_all_checkbox())
        assert pg.edit_listings_button().text == 'Edit 102 Listings'

            # clck the Edit Listings
        click(pg.edit_listings_button())
        sleep(1)

            # check the listings 1st page
        listing_rows = bp.listing_rows()
        assert len(listing_rows) == 25
        for listing_row in listing_rows:
            row_class = listing_row.get_attribute('class')
            assert 'selected' in row_class.split(' ')

        click(bp.next_page_button())
        sleep(2)

            # check the listings 2nd page
        listing_rows = bp.listing_rows()
        assert len(listing_rows) == 50
        for listing_row in listing_rows:
            row_class = listing_row.get_attribute('class')
            assert 'selected' in row_class.split(' ')
