# /usr/bin/env python

import pytest
from fixtures.fixtures import login, reload, select_listings_to_edit, test_id, rabbit_init

from flaky import flaky
from pages.main_page import MainPage
from pages.bulk_page import BulkPage
from selenium.webdriver.common.keys import Keys
from tests.base import BaseTestClass, BACKSPACE_KEYS
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from tests.variations import check_etsy_emulator_requests, check_db_state, DB_INITIAL_VARIATION_PROPERTIES, \
    DB_INITIAL_VARIATION_OPTIONS
from pages.bulk_page_inventory_price import BulkPageInventoryPrice

expected_listings_01 = {
            'Product #1 without variations': '$500.00',
            'Product #2 with one variation with pricing': [
                ('Beige', '$1.00'),
                ('Black', '$2.00'),
                ('Blue', '$3.00'),
                ('Silver', '$4.00'),
                ('White', '$5.00'),
                ('Yellow', '$6.00'),
                ('Custom color 1', '$7.00'),
                ('Custom color 2', '$8.00')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '$10.00'),
                ('XXS US Women\'s', 'Material 2', '$20.00'),
                ('XXS US Women\'s', 'Material 3', '$30.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$40.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$50.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$60.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$70.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$80.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$90.00'),
            ]
        }

@pytest.mark.usefixtures("test_status", "test_id", "rabbit_init", "reload", "login", "select_listings_to_edit")
@flaky
class TestBulkInventoryPrice(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.sql_file = 'listings_13'    # will be loaded by 'reload' fixture
        self.listings_to_select = 'ALL'  # used by select_listings_to_edit fixture
        self.listing_status = 'Active'    # used by select_listings_to_edit fixture
        self.bulk_tab = 'Price'     # used by select_listings_to_edit fixture

    # --- Tests ---

    def select_listings_to_edit(self, operation=None):
        mp = MainPage(self.driver)
        bp = BulkPage(self.driver)

        mp.select_listings_to_edit()
        click(bp.edit_part('Price'))
        if operation is not None:
            bp.select_operation(operation)

    def check_listing_options(self, actual, expected):
        for product in actual:
            assert actual[product] == expected[product]
    ### Tests ###

    # --------------------------------------------------------------------------------
    def test_inventory_set_price_normal(self):
        """ Tests that a price can be set in bulk edit inventory
        """
        expected_listings_02 = {
            'Product #1 without variations': '$42.00',
            'Product #2 with one variation with pricing': [
                ('Beige', '$42.00'),
                ('Black', '$42.00'),
                ('Blue', '$42.00'),
                ('Silver', '$42.00'),
                ('White', '$42.00'),
                ('Yellow', '$42.00'),
                ('Custom color 1', '$42.00'),
                ('Custom color 2', '$42.00')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '$42.00'),
                ('XXS US Women\'s', 'Material 2', '$42.00'),
                ('XXS US Women\'s', 'Material 3', '$42.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$42.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$42.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$42.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$42.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$42.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$42.00')
            ]
        }
        expected_listings_03 = {
            'Product #1 without variations': '$123.46',
            'Product #2 with one variation with pricing': [
                ('Beige', '$123.46'),
                ('Black', '$123.46'),
                ('Blue', '$123.46'),
                ('Silver', '$123.46'),
                ('White', '$123.46'),
                ('Yellow', '$123.46'),
                ('Custom color 1', '$123.46'),
                ('Custom color 2', '$123.46')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '$123.46'),
                ('XXS US Women\'s', 'Material 2', '$123.46'),
                ('XXS US Women\'s', 'Material 3', '$123.46'),
                ('One size (plus) US Women\'s', 'Material 1', '$123.46'),
                ('One size (plus) US Women\'s', 'Material 2', '$123.46'),
                ('One size (plus) US Women\'s', 'Material 3', '$123.46'),
                ('Custom size 1 US Women\'s', 'Material 1', '$123.46'),
                ('Custom size 1 US Women\'s', 'Material 2', '$123.46'),
                ('Custom size 1 US Women\'s', 'Material 3', '$123.46'),

            ]
        }
        operation = 'Change To'

        bip = BulkPageInventoryPrice(self.driver, self.ts)
        actual_listings = bip.listing_details()

        self.check_listing_options(actual_listings, expected_listings_01)

        bip.select_operation(operation)
        input_field = bip.operation_input()
        send_keys(input_field, '42')
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        # Apply changes
        click(bip.operation_apply())
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'

        bip.select_operation(operation)
        input_field = bip.operation_input()
        send_keys(input_field, '123.456')

        # Apply changes
        click(bip.operation_apply())
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_03)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'

    # --------------------------------------------------------------------------------
    def test_inventory_price_invalid_bulk(self):
        """ Tests that a price invalid characters cannot be entered
        """
        bip = BulkPageInventoryPrice(self.driver, self.ts)

        input_field = bip.operation_input()
        send_keys(input_field, 'foo')

        err = bip.error_baloon()
        assert err == "Must be a number"

        assert bip.operation_apply().is_enabled() is False, 'Apply button is not disabled'

        send_keys(input_field, BACKSPACE_KEYS + ' 123')
        err = bip.error_baloon()
        assert err == "Must be a number"

        send_keys(input_field, BACKSPACE_KEYS + '0x10')
        err = bip.error_baloon()
        assert err == "Must be a number"

        send_keys(input_field, BACKSPACE_KEYS + '-1')
        err = bip.error_baloon()
        assert err == "Must be positive number"

    def test_inventory_price_invalid_inline(self):
        """ Tests that error message is shown when invalid price is entered using inline edit
        """

        bip = BulkPageInventoryPrice(self.driver, self.ts)

        # Set price of a listing to negative value using inline edit
        row = bip.listing_row('Product #1 without variations')
        bip.set_individual_price(row, '-1', enter=False)

        # Check that error message is shown on listing
        assert bip.error_baloon_texts(row) == ["Must be positive number"]

        # Verify that invalid price is not applied - original price should be preserved
        bip.set_individual_price(row, 'a')
        assert bip.product_price_text(row) == '$500.00'

    # --------------------------------------------------------------------------------
    def test_inventory_increase_price_dollars(self):
        """ Tests that a price can be increased in bulk edit
        """
        expected_listings_02 = {
            'Product #1 without variations': '$510.00',
            'Product #2 with one variation with pricing': [
                ('Beige', '$11.00'),
                ('Black', '$12.00'),
                ('Blue', '$13.00'),
                ('Silver', '$14.00'),
                ('White', '$15.00'),
                ('Yellow', '$16.00'),
                ('Custom color 1', '$17.00'),
                ('Custom color 2', '$18.00'),
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '$10.00'),
                ('XXS US Women\'s', 'Material 2', '$20.00'),
                ('XXS US Women\'s', 'Material 3', '$30.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$40.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$50.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$60.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$70.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$80.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$90.00'),
            ]
        }

        operation = 'Increase By'

        bip = BulkPageInventoryPrice(self.driver, self.ts)

        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_01)

        # unselect 3rd
        bip.click_on_listings(['Product #3 with two variations with quantity on both and pricing on both'])
        bip.select_operation(operation)
        input_field = bip.operation_input_dolars()
        send_keys(input_field, '10')
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        # Apply changes
        click(bip.operation_apply())
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'


    # --------------------------------------------------------------------------------
    def test_inventory_increase_price_percent(self):
        """ Tests that a price can be increased by % in bulk edit
        """
        expected_listings_02 = {
            'Product #1 without variations': '$500.00',
            'Product #2 with one variation with pricing': [
                ('Beige', '$1.56'),
                ('Black', '$3.12'),
                ('Blue', '$4.68'),
                ('Silver', '$6.24'),
                ('White', '$7.80'),
                ('Yellow', '$9.36'),
                ('Custom color 1', '$10.92'),
                ('Custom color 2', '$12.48')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [
                ('XXS US Women\'s', 'Material 1', '$15.60'),
                ('XXS US Women\'s', 'Material 2', '$31.20'),
                ('XXS US Women\'s', 'Material 3', '$46.80'),
                ('One size (plus) US Women\'s', 'Material 1', '$62.40'),
                ('One size (plus) US Women\'s', 'Material 2', '$78.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$93.60'),
                ('Custom size 1 US Women\'s', 'Material 1', '$109.20'),
                ('Custom size 1 US Women\'s', 'Material 2', '$124.80'),
                ('Custom size 1 US Women\'s', 'Material 3', '$140.40')
            ]
        }

        bip = BulkPageInventoryPrice(self.driver, self.ts)

        operation = 'Increase By'
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_01)

        # unselect 1st
        bip.click_on_listings(['Product #1 without variations'])
        bip.select_operation(operation)
        # use %
        click(bip.operation_switch_percent())

        input_field = bip.operation_input_dolars()
        send_keys(input_field, '56')
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        # Apply changes
        click(bip.operation_apply())
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'

    # --------------------------------------------------------------------------------
    def test_inventory_decrease_price_dollars(self):
        """ Tests that a price can be decreased in bulk edit
        """
        expected_listings_02 = {
            'Product #2 with one variation with pricing': [
                ('Beige', '$1.00'),
                ('Black', '$2.00'),
                ('Blue', '$3.00'),
                ('Silver', '$4.00'),
                ('White', '$5.00'),
                ('Yellow', '$6.00'),
                ('Custom color 1', '$7.00'),
                ('Custom color 2', '$8.00')
            ],
            'Product #1 without variations': '$495.00',
            'Product #3 with two variations with quantity on both and pricing on both': [
                ('XXS US Women\'s', 'Material 1', '$5.00'),
                ('XXS US Women\'s', 'Material 2', '$15.00'),
                ('XXS US Women\'s', 'Material 3', '$25.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$35.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$45.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$55.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$65.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$75.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$85.00')
            ]}
        expected_listings_03 = {
            'Product #1 without variations': '$465.00',
            'Product #2 with one variation with pricing': [
                ('Beige', '$1.00'),
                ('Black', '$2.00'),
                ('Blue', '$3.00'),
                ('Silver', '$4.00'),
                ('White', '$5.00'),
                ('Yellow', '$6.00'),
                ('Custom color 1', '$7.00'),
                ('Custom color 2', '$8.00')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [
                ('XXS US Women\'s', 'Material 1', '$-25.00', 'Must be positive number'),
                ('XXS US Women\'s', 'Material 2', '$-15.00', 'Must be positive number'),
                ('XXS US Women\'s', 'Material 3', '$-5.00', 'Must be positive number'),
                ('One size (plus) US Women\'s', 'Material 1', '$5.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$15.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$25.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$35.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$45.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$55.00')
            ]
        }
        expected_listings_04 = {
            'Product #1 without variations': '$10.50',
            'Product #2 with one variation with pricing': [
                ('Beige', '$1.00'),
                ('Black', '$2.00'),
                ('Blue', '$3.00'),
                ('Silver', '$4.00'),
                ('White', '$5.00'),
                ('Yellow', '$6.00'),
                ('Custom color 1', '$7.00'),
                ('Custom color 2', '$8.00')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [
                ('XXS US Women\'s', 'Material 1', '$99.00'),
                ('XXS US Women\'s', 'Material 2', '$99.00'),
                ('XXS US Women\'s', 'Material 3', '$99.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$99.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$99.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$99.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$99.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$99.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$99.00')
            ]
        }
        operation = 'Decrease By'

        bip = BulkPageInventoryPrice(self.driver, self.ts)

        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_01)

            # unselect 2nd
        bip.click_on_listings(['Product #2 with one variation with pricing'])
        bip.select_operation(operation)

        input_field = bip.operation_input_dolars()
        send_keys(input_field, '5')

            # Apply changes
        click(bip.operation_apply())
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'

        # try negative
        bip.select_operation(operation)
        input_field = bip.operation_input_dolars()
        send_keys(input_field, '30')
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_03)

        send_keys(input_field, Keys.END + BACKSPACE_KEYS)

        # Change individual price, make sure bulk still works
        bip.click_on_listings(['Product #1 without variations'])  # unselect listing for inline edit
        row = bip.listing_row('Product #1 without variations')
        assert bip.product_price_text(row) == '$495.00'
        bip.set_individual_price(row, '10.50')

        operation = 'Change To'
        bip.select_operation(operation)
        input_field = bip.operation_input_dolars()

        send_keys(input_field, '99')

        click(bip.operation_apply(), delay=2)

        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_04)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'

    # --------------------------------------------------------------------------------
    def test_inventory_decrease_price_percent(self):
        """ Tests that a price can be decreased by % in bulk edit
        Also test the results in DB and check requests made to Etsy emulator.
        """

        self.set_etsy_testcase('listings_push_inventory')

        expected_listings_02 = {
            'Product #1 without variations': '$250.00',
            'Product #2 with one variation with pricing': [
                ('Beige', '$0.50'),
                ('Black', '$1.00'),
                ('Blue', '$1.50'),
                ('Silver', '$2.00'),
                ('White', '$2.50'),
                ('Yellow', '$3.00'),
                ('Custom color 1', '$3.50'),
                ('Custom color 2', '$4.00')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '$5.00'),
                ('XXS US Women\'s', 'Material 2', '$10.00'),
                ('XXS US Women\'s', 'Material 3', '$15.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$20.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$25.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$30.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$35.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$40.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$45.00'),
            ]
        }

        expected_product_offerings = [
            ['1', '250.00', '550', '50', 't', '', '', '', ''],
            ['2', '0.50', '111', '11', 't', 'Beige', '1', '', ''],
            ['2', '1.00', '111', '11', 't', 'Black', '2', '', ''],
            ['2', '1.50', '111', '11', 'f', 'Blue', '3', '', ''],
            ['2', '2.00', '111', '11', 'f', 'Silver', '4', '', ''],
            ['2', '2.50', '111', '11', 't', 'White', '5', '', ''],
            ['2', '3.00', '111', '11', 't', 'Yellow', '6', '', ''],
            ['2', '3.50', '111', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '4.00', '111', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '5.00', '222', '1', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '10.00', '222', '2', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '15.00', '222', '3', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '20.00', '222', '4', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '25.00', '222', '5', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '30.00', '222', '6', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '35.00', '222', '7', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '40.00', '222', '8', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '45.00', '222', '9', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        from data.test_inventory_price_decrease_percent_expected_data import expected_api_calls

        operation = 'Decrease By'

        bip = BulkPageInventoryPrice(self.driver, self.ts)

        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_01)

        # use %
        bip.select_operation(operation)
        click(bip.operation_switch_percent())

        input_field = bip.operation_input_dolars()
        send_keys(input_field, '50')

        # Apply changes and check Apply button after that
        click(bip.operation_apply())
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert bip.operation_apply().is_enabled() is False, 'Apply button is enabled'

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bip.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bip.is_part_modified('Price') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bip.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bip.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bip.is_part_modified('Price') is False, 'Blue dot is still shown'

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, DB_INITIAL_VARIATION_PROPERTIES, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

    # --------------------------------------------------------------------------------
    def test_inventory_update_single_price(self):
        """ Tests that single price can be updated
        """

        expected_listings_02 = {
            'Product #1 without variations': '$10.50',
            'Product #2 with one variation with pricing': [
                ('Beige', '$1.00'),
                ('Black', '$2.00'),
                ('Blue', '$3.00'),
                ('Silver', '$4.00'),
                ('White', '$5.00'),
                ('Yellow', '$6.00'),
                ('Custom color 1', '$7.00'),
                ('Custom color 2', '$8.00')
            ],
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '$99.00'),
                ('XXS US Women\'s', 'Material 2', '$99.00'),
                ('XXS US Women\'s', 'Material 3', '$99.00'),
                ('One size (plus) US Women\'s', 'Material 1', '$99.00'),
                ('One size (plus) US Women\'s', 'Material 2', '$99.00'),
                ('One size (plus) US Women\'s', 'Material 3', '$99.00'),
                ('Custom size 1 US Women\'s', 'Material 1', '$99.00'),
                ('Custom size 1 US Women\'s', 'Material 2', '$99.00'),
                ('Custom size 1 US Women\'s', 'Material 3', '$99.00'),
            ]
        }

        bip = BulkPageInventoryPrice(self.driver, self.ts)

        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_01)

        # unselect 1st
        bip.click_on_listings(['Product #1 without variations'])
        # unselect 2nd
        bip.click_on_listings(['Product #2 with one variation with pricing'])

        # perform individual (inline) change of listing #1
        row = bip.listing_row('Product #1 without variations')
        assert bip.product_price_text(row) == '$500.00'
        bip.set_individual_price(row, '10.50')

        # perform bulk change of selected listings (only 3rd)
        bip.select_operation('Change To')
        input_field = bip.operation_input_dolars()
        send_keys(input_field, '99')

        # apply changes
        click(bip.operation_apply())

        wait_for_web_assert(False, bip.operation_apply().is_enabled, 'Apply button is enabled')

        # check listings
        actual_listings = bip.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

    def test_inventory_price_non_visible_offerings(self):
        """ Test verifies that non visible offerings are marked as non visible in UI
        """

        expected_visibilities = [True, True, False, False, True, True, True, True]

        bip = BulkPageInventoryPrice(self.driver, self.ts)
        row = bip.listing_row('Product #2 with one variation with pricing')
        assert bip.options_visibility(row) == expected_visibilities, 'Visibility of offerings is not set as expected'

