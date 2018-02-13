# /usr/bin/env python
import pytest
from time import sleep
from tests.base import BaseTestClass, click, run_sql
from modules.selenium_tools import send_keys, click
from pages.main_page import MainPage
from pages.login_page import LoginPage
from selenium.webdriver.common.keys import Keys
from fixtures.fixtures import test_id
from flaky import flaky
import re

@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestFilterTabs(BaseTestClass):

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

        pg = MainPage(self.driver)
        pg.get_main(self.base_url)

    # --- Tests ---

    def test_filter_tabs(self):
        """ Tests the filter tabs (names, listing counts)
        """

        d = self.driver
        pg = MainPage(d)

        # tab names
        filter_tabs = pg.filter_tabs()
        tab_names = [t.text for t in filter_tabs]
        assert tab_names == ['Active', 'Draft', 'Inactive']
        # number of listings    TODO - all nums
        tab_numbers = [t.text for t in pg.filter_tabs_counts()]
        assert tab_numbers == ['0', '3', '1']

    # --------------------------------------------------------------------------------
    def test_filter_tab_listings(self):
        """ Tests that the right listings are selected when filter-tab is clicked
        """

        expected_listings = {
            'Draft': [
                'VarTEST Tangle Free Headphones w/mic Earbuds, Custom Wrapped Match Your Phone Case iPhone 6 Plus 5 4 iPad iPod Android Smartphone Phone',
                'Vartest TEST SALE! Wild Berry Wrapped Earbuds or EarPods for iPhone/Android',
                'Vartest TEST Sea Tangle Free Earbuds iPhone Android Tablets iPod by MyBuds'
            ],
            'Inactive': [
                'MC Test Hand Built Ring Catchers The Perfect Party Favor for Your Next Event megha'
            ],
        }
        d = self.driver
        pg = MainPage(d)

        for tab_name, listings in expected_listings.items():
            pg.select_filter_tab(tab_name)
            sleep(2)
            titles = pg.listing_titles_sorted()
            assert titles == listings


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestFilters(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        self.set_etsy_testcase(self, 'tc1')
        # we can afford to load data to DB once, DB is not changed in tests in this class
        run_sql('HIVE', 'listings_02', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        pg = MainPage(self.driver)
        pg.get_main(self.base_url)

    def get_filters(self):
        actual_filters = []
        d = self.driver
        pg = MainPage(d)
        section_divs = pg.filter_group_divs()
        for div in section_divs:
            section_name = div.find_element_by_css_selector('h6').text
            section_items = [t.text for t in div.find_elements_by_css_selector('ul > li')]
            actual_filters.append({'section': section_name, 'items': section_items})
        return actual_filters

    # --- Tests ---

    def test_filters_all(self):
        """ Tests the filters are correct when no checkbox is checked
        """

        d = self.driver
        pg = MainPage(d)

        expected_filters = [
            {'section': 'CATEGORIES', 'items': ['Clothing\n5', 'Jewelry\n1']},
            {'section': 'SECTION',    'items': ['Summer Sale\n3', 'On Sale\n2']},
            {'section': 'TAGS',       'items': ['Tag01\n3', 'Tag02\n2', 'Tag03 looong name\n1']},
            {'section': 'MATERIALS',  'items': ['cotton\n2', 'iron\n2', 'plastic\n1', 'wool\n1']}
        ]

        pg.select_filter_tab('Active')
        sleep(1)

        actual_filters = self.get_filters()
        assert actual_filters == expected_filters

    # --------------------------------------------------------------------------------
    def test_filters_tags(self):
        """ Tests the filter are correct for tags selected
        """

        d = self.driver
        pg = MainPage(d)

        expected_filters = [
            {'section': 'CATEGORIES', 'items': ['Clothing\n1', 'Jewelry\n1']},
            {'section': 'SECTION', 'items': ['On Sale\n1', 'Summer Sale\n1']},
            {'section': 'TAGS', 'items': ['Tag01\n3', 'Tag02\n2', 'Tag03 looong name\n1']},
            {'section': 'MATERIALS', 'items': ['iron\n1', 'plastic\n1']}
        ]

        pg.select_filter_tab('Active')
        sleep(1)

        cb = pg.filter_checkbox('TAGS', 'Tag02')
        assert cb is not None
        click(cb)
        sleep(2)

        actual_filters = self.get_filters()
        assert actual_filters == expected_filters

        listings = pg.listing_titles_sorted()
        assert listings == ['Fifth something', 'Forth something 123456']

    # --------------------------------------------------------------------------------
    def test_filters_tags_catgs(self):
        """ Tests the filter are correct for tags and categories selected
        """

        d = self.driver
        pg = MainPage(d)

        expected_filters = [
            {'section': 'CATEGORIES', 'items': ['Clothing\n1', 'Jewelry\n1']},
            {'section': 'SECTION', 'items': ['Summer Sale\n1']},
            {'section': 'TAGS', 'items': ['Tag02\n1']},
            {'section': 'MATERIALS', 'items': ['plastic\n1']}
        ]

        pg.select_filter_tab('Active')
        sleep(1)

        cb = pg.filter_checkbox('TAGS', 'Tag02')
        assert cb is not None
        click(cb)
        sleep(2)
        cb = pg.filter_checkbox('CATEGORIES', 'Jewelry')
        assert cb is not None
        click(cb)
        sleep(2)

        actual_filters = self.get_filters()
        assert actual_filters == expected_filters

        listings = pg.listing_titles_sorted()
        assert listings == ['Forth something 123456']

    # --------------------------------------------------------------------------------
    def test_filter_search(self):
        """ Tests the filter search
        """

        d = self.driver
        pg = MainPage(d)

        expected_filters = [
            {'section': 'CATEGORIES', 'items': ['Clothing\n2']},
            {'section': 'SECTION', 'items': ['On Sale\n1', 'Summer Sale\n1']},
            {'section': 'TAGS', 'items': ['Tag01\n1', 'Tag02\n1']},
            {'section': 'MATERIALS', 'items': ['iron\n1', 'wool\n1']}
        ]

        pg.select_filter_tab('Active')
        sleep(1)

        srch = pg.filter_search()
        send_keys(srch, 'fi')
        send_keys(srch, Keys.RETURN)
        sleep(1)

        actual_filters = self.get_filters()
        assert actual_filters == expected_filters

        listings = pg.listing_titles_sorted()
        assert listings == ['Fifth something', 'First something 1234']

    # --------------------------------------------------------------------------------
    def test_filter_search_special(self):
        """ Tests the filter search - find existing product "LG-512a"
        """

        d = self.driver
        pg = MainPage(d)

        pg.select_filter_tab('Active')
        sleep(1)

        srch = pg.filter_search()
        send_keys(srch, 'LG-512a')
        send_keys(srch, Keys.RETURN)

        listings = pg.listing_titles_sorted()
        assert listings == ['Third something LG-512a']


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestEmptyPage(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.stop_all(self)
        # we can afford to load data to DB once, DB is not changed in tests in this class
        run_sql('HIVE', 'listings_empty', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all(self)

    def setup_method(self, method):
        super().setup_method(method)

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        pg = MainPage(self.driver)
        pg.get_main(self.base_url)

    def test_empty_state(self):
        """ Tests the appropriate image is displayed when e.g. Draft section has no listings
        """

        expected_results = [
            {'tab': 'Active',   'msg': 'No Active Listings',   'img': '34cdcfdb4fb5de5756d8dbe04de7c60c.png'},
            {'tab': 'Draft',    'msg': 'No Draft Listings',    'img': '5ee912b2f3d2cdf253f47f4285fc6d01.png'},
            {'tab': 'Inactive', 'msg': 'No Inactive Listings', 'img': '478d463c0e5ae5475487662104b96a58.png'},
        ]
        d = self.driver
        pg = MainPage(d)

        for tab_data in expected_results:   # Active, Draft, Inactive
            pg.select_filter_tab(tab_data['tab'])
            sleep(1)
            # check message
            msg = d.find_element_by_css_selector('div.no-listings-placeholder div.message').text
            assert msg == tab_data['msg']
            # check image
            img = d.find_element_by_css_selector('div.no-listings-placeholder img')
            img_src = img.get_attribute('src')
            img_src = re.sub('.*/', '', img_src)    # image filename (<hash>.png) only
            assert img_src == tab_data['img']
