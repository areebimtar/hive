# /usr/bin/env python
import pytest
from time import sleep
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import click
from modules.testing import wait_for_assert
from modules.rabbit import setup_rabbit
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from fixtures.fixtures import test_id, rabbit_init, reload, login, select_listings_to_edit
from flaky import flaky


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestBulkCategory(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.set_etsy_testcase(self, 'tc1')

    def setup_method(self, method):
        super().setup_method(method)

        self.stop_all()
        setup_rabbit()
        run_sql('HIVE', "listings_03", retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        d = self.driver
        pg = MainPage(d)
        pg.get_main(self.base_url)
        pg.select_filter_tab('Active')

    # --------------------------------------------------------------------------------
    def select_listings_to_edit(self):
        mp = MainPage(self.driver)
        bp = BulkPage(self.driver)

        mp.select_listings_to_edit()
        click(bp.edit_part('Category'))

    # --------------------------------------------------------------------------------
    def select_single(self, row, position, new_value):
        d = self.driver
        bp = BulkPage(d)
        element = bp.category_elements(row)[position]
        click(element)
        sleep(2)
        category_found = False
        for item in element.find_elements_by_css_selector('div.bulk-edit-dropdown ul li'):
            if item.text == new_value:
                d.execute_script("arguments[0].scrollIntoView(true);", item);
                click(item)
                sleep(1)
                category_found = True
                break
        if not category_found:
            raise Exception("Error: select_single: " + new_value + " not found")


    ### Tests ###

    # --------------------------------------------------------------------------------
    def test_create_category(self):
        """ Tests that a category can be created in bulk edit
        """
        expected_listings_01 = [
            'First something 1234 (1)\nClothing\nMen\'s Clothing\nSocks\nChoose Category',
            'Second something 1235 (2)\nClothing\nMen\'s Clothing\nSocks\nChoose Category',
            'Third something LG-512a (3)\nClothing\nMen\'s Clothing\nPants'
        ]

        expected_listings_02 = [
            'First something 1234 (1)\nAccessories\nCostume Accessories\nCostume Tails & Ears\nCostume Ears',
            'Second something 1235 (2)\nAccessories\nCostume Accessories\nCostume Tails & Ears\nCostume Ears',
            'Third something LG-512a (3)\nAccessories\nCostume Accessories\nCostume Tails & Ears\nCostume Ears'
        ]

        self.select_listings_to_edit()
        d = self.driver
        bp = BulkPage(d)

        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings_01

        bp.select_category(['Accessories', 'Costume Accessories', 'Costume Tails & Ears', 'Costume Ears'])


            # Apply changes
        click(bp.operation_apply())
        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings_02

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    def test_edit_single_category(self):
        """ Tests that a single category can be edited
        """
        expected_listings_01 = [
            'First something 1234 (1)\nClothing\nMen\'s Clothing\nSocks\nChoose Category',
            'Second something 1235 (2)\nClothing\nMen\'s Clothing\nSocks\nChoose Category',
            'Third something LG-512a (3)\nClothing\nMen\'s Clothing\nPants'
        ]

        expected_data = [['1', '1761']]

        self.select_listings_to_edit()
        d = self.driver
        bp = BulkPage(d)

        actual_listings = bp.listing_rows_texts_sorted()
        assert actual_listings == expected_listings_01

        # update category of the 1st listing
        row = bp.listing_row('First something 1234 (1)')
        bp.select_category(['Accessories', 'Costume Accessories', 'Costume Tails & Ears', 'Costume Ears'], row, True)

        click(bp.sync_updates_button())

        wait_for_assert(expected_data,
                        lambda: run_sql('HIVE', 'select_taxonomy_id_modified', True),
                        'Unexpected taxonomy ID in DB')


@pytest.mark.usefixtures("test_status", "test_id", "rabbit_init", "reload", "login", "select_listings_to_edit")
@flaky
class TestBulkCategoryVariations(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.sql_file = 'listings_13'    # will be loaded by 'reload' fixture
        self.listings_to_select = 'ALL'   # used by select_listings_to_edit fixture
        self.listing_status = 'Active'    # used by select_listings_to_edit fixture
        self.bulk_tab = 'Category'     # used by select_listings_to_edit fixture

    # --- Tests ---

    def test_bulk_category_variations_validation(self):
        """ Test verifies that error message is shown when attempting to change Category to incompatible
        with existing Variation property / scale on the listing, and that Category is not changed for such listing
        """

        expected_categories = [
            ['Jewelry', 'Brooches'],
            ['Jewelry', 'Brooches'],
            ['Clothing', 'Women\'s Clothing', 'Dresses']
        ]

        category = ['Jewelry', 'Brooches']

        bp = BulkPage(self.driver)
        # change to incompatible category (3rd listing)
        bp.select_category(category)

        row = bp.listing_row('Product #3 with two variations with quantity on both and pricing on both')

        # check that error is shown
        assert bp.error_baloon_texts(row) ==\
            ['The selected category is not compatible with the variations of this listing'],\
            'Incorrect validation error message for listing #3'

        # Apply and check that category was set for 1st and 2nd listings, for 3rd it hasn't changed
        click(bp.operation_apply())
        for i, row in enumerate(bp.listing_rows()):
            category_names = bp.category_names(row)
            assert category_names == expected_categories[i]
