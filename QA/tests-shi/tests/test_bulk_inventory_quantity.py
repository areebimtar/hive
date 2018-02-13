
# /usr/bin/env python

import pytest
from fixtures.fixtures import login, rabbit_init, reload, select_listings_to_edit, test_id

from flaky import flaky
from pages.main_page import MainPage
from pages.bulk_page import BulkPage
from tests.base import BaseTestClass, BACKSPACE_KEYS
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from time import sleep
from pages.bulk_page_inventory_quantity import BulkPageInventoryQuantity
from tests.variations import check_etsy_emulator_requests, check_db_state, DB_INITIAL_VARIATION_PROPERTIES, \
    DB_INITIAL_VARIATION_OPTIONS

expected_listings_01 = {
    'Product #1 without variations': '50',
    'Product #2 with one variation with pricing': '11',
    'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '1'),
                ('XXS US Women\'s', 'Material 2', '2'),
                ('XXS US Women\'s', 'Material 3', '3'),
                ('One size (plus) US Women\'s', 'Material 1', '4'),
                ('One size (plus) US Women\'s', 'Material 2', '5'),
                ('One size (plus) US Women\'s', 'Material 3', '6'),
                ('Custom size 1 US Women\'s', 'Material 1', '7'),
                ('Custom size 1 US Women\'s', 'Material 2', '8'),
                ('Custom size 1 US Women\'s', 'Material 3', '9'),
            ]
        }


@pytest.mark.usefixtures("test_status", "test_id", "rabbit_init", "reload", "login", "select_listings_to_edit")
@flaky
class TestBulkInventoryQuantity(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.sql_file = 'listings_13'    # will be loaded by 'reload' fixture
        self.listings_to_select = 'ALL'  # used by select_listings_to_edit fixture
        self.listing_status = 'Active'    # used by select_listings_to_edit fixture
        self.bulk_tab = 'Quantity'     # used by select_listings_to_edit fixture

    # --- Tests ---

    def select_listings_to_edit(self, operation=None):
        mp = MainPage(self.driver)
        bp = BulkPage(self.driver)

        mp.select_listings_to_edit()
        click(bp.edit_part('Quantity'))
        if operation is not None:
            bp.select_operation(operation)

    def check_listing_options(self, actual, expected):
        for product in actual:
            assert actual[product] == expected[product]

    ### Tests ###

    # --------------------------------------------------------------------------------
    def test_inventory_set_quantity_normal(self):
        """ Tests that a quantity can be set in bulk edit inventory
        """
        expected_listings_02 = {
            'Product #1 without variations': '36',
            'Product #2 with one variation with pricing': '36',
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '36'),
                ('XXS US Women\'s', 'Material 2', '36'),
                ('XXS US Women\'s', 'Material 3', '36'),
                ('One size (plus) US Women\'s', 'Material 1', '36'),
                ('One size (plus) US Women\'s', 'Material 2', '36'),
                ('One size (plus) US Women\'s', 'Material 3', '36'),
                ('Custom size 1 US Women\'s', 'Material 1', '36'),
                ('Custom size 1 US Women\'s', 'Material 2', '36'),
                ('Custom size 1 US Women\'s', 'Material 3', '36'),
            ]
        }
        expected_listings_03 = {
            'Product #1 without variations': '10',
            'Product #2 with one variation with pricing': '6',
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '6'),
                ('XXS US Women\'s', 'Material 2', '6'),
                ('XXS US Women\'s', 'Material 3', '6'),
                ('One size (plus) US Women\'s', 'Material 1', '6'),
                ('One size (plus) US Women\'s', 'Material 2', '6'),
                ('One size (plus) US Women\'s', 'Material 3', '6'),
                ('Custom size 1 US Women\'s', 'Material 1', '6'),
                ('Custom size 1 US Women\'s', 'Material 2', '6'),
                ('Custom size 1 US Women\'s', 'Material 3', '6'),
            ]
        }

        biq = BulkPageInventoryQuantity(self.driver, self.ts)
        actual_listings = biq.listing_details()

        self.check_listing_options(actual_listings, expected_listings_01)

        operation = 'Change To'
        biq.select_operation(operation)
        input_field = biq.operation_input()
        send_keys(input_field, '36')

        # Apply changes
        click(biq.operation_apply())
        actual_listings = biq.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert biq.operation_apply().is_enabled() is False, 'Apply button is enabled'

        # individual change
        row = biq.listing_row('Product #1 without variations')
        assert biq.product_quantity_text(row) == '36'
        biq.set_individual_quantity(row, '10')

        # bulk change
        biq.select_operation(operation)
        input_field = biq.operation_input()

        send_keys(input_field, '6')

        # Apply and check listings
        click(biq.operation_apply())
        wait_for_web_assert(False, biq.operation_apply().is_enabled, 'Apply button is enabled')

        actual_listings = biq.listing_details()
        self.check_listing_options(actual_listings, expected_listings_03)

        # --------------------------------------------------------------------------------

    def test_inventory_quantity_invalid_bulk(self):
        """ Tests that a quantity invalid characters cannot be entered
        """
        biq = BulkPageInventoryQuantity(self.driver, self.ts)

        input_field = biq.operation_input()
        send_keys(input_field, 'foo')

        err = biq.error_baloon()
        assert err == "Use a whole number between 0 and 999"

        assert biq.operation_apply().is_enabled() is False, 'Apply button is not disabled'

        send_keys(input_field, BACKSPACE_KEYS + ' 123')
        err = biq.error_baloon()
        assert err == "Use a whole number between 0 and 999"

        send_keys(input_field, BACKSPACE_KEYS + '0x10')
        err = biq.error_baloon()
        assert err == "At least one offering must be in stock"

        send_keys(input_field, BACKSPACE_KEYS + '-1')
        err = biq.error_baloon()
        assert err == "Use a whole number between 0 and 999"

        send_keys(input_field, BACKSPACE_KEYS + '1.45')
        err = biq.error_baloon()
        assert err == "Use a whole number between 0 and 999"

    def test_inventory_quantity_invalid_inline(self):
        """ Tests that error messages are shown when invalid quantity is entered using inline edit
        """

        biq = BulkPageInventoryQuantity(self.driver, self.ts)

        # Set quantity  of a listing to negative value using inline edit
        row = biq.listing_row('Product #1 without variations')
        biq.set_individual_quantity(row, '-1', enter=False)

        # Check that error message is shown on listing for invalid number
        assert biq.error_baloon_texts(row) == ['Use a whole number between 0 and 999']

        # Check that another error message for Qty=0 is shown directly on listing
        biq.set_individual_quantity(row, '0', enter=False)
        assert biq.product_quantity_global_error(row) == 'At least one offering must be in stock'

        # Verify that invalid quantity is not applied - original quantity should be preserved
        biq.set_individual_quantity(row, 'a')
        assert biq.product_quantity_text(row) == '50'

    def test_inventory_increase_quantity(self):
        """ Tests that a quantity can be increased in bulk edit
        Also test the results in DB and check requests made to Etsy emulator.
        """

        self.set_etsy_testcase('listings_push_inventory')

        expected_listings_02 = {
            'Product #1 without variations': '60',
            'Product #2 with one variation with pricing': '21',
            'Product #3 with two variations with quantity on both and pricing on both': [

                ('XXS US Women\'s', 'Material 1', '11'),
                ('XXS US Women\'s', 'Material 2', '12'),
                ('XXS US Women\'s', 'Material 3', '13'),
                ('One size (plus) US Women\'s', 'Material 1', '14'),
                ('One size (plus) US Women\'s', 'Material 2', '15'),
                ('One size (plus) US Women\'s', 'Material 3', '16'),
                ('Custom size 1 US Women\'s', 'Material 1', '17'),
                ('Custom size 1 US Women\'s', 'Material 2', '18'),
                ('Custom size 1 US Women\'s', 'Material 3', '19'),
            ]
        }

        expected_product_offerings = [
            ['1', '500.00', '550', '60', 't', '', '', '', ''],
            ['2', '1.00', '111', '21', 't', 'Beige', '1', '', ''],
            ['2', '2.00', '111', '21', 't', 'Black', '2', '', ''],
            ['2', '3.00', '111', '21', 'f', 'Blue', '3', '', ''],
            ['2', '4.00', '111', '21', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', '111', '21', 't', 'White', '5', '', ''],
            ['2', '6.00', '111', '21', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', '111', '21', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', '111', '21', 't', 'Custom color 2', '8', '', ''],
            ['3', '10.00', '222', '11', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '20.00', '222', '12', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '30.00', '222', '13', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '40.00', '222', '14', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '50.00', '222', '15', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '60.00', '222', '16', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '70.00', '222', '17', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '80.00', '222', '18', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '90.00', '222', '19', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        from data.test_inventory_increase_quantity_expected_data import expected_api_calls

        operation = 'Increase By'

        biq = BulkPageInventoryQuantity(self.driver, self.ts)

        actual_listings = biq.listing_details()
        self.check_listing_options(actual_listings, expected_listings_01)

        # select operation and enter price difference
        biq.select_operation(operation)
        input_field = biq.quantity_input()
        send_keys(input_field, '10')

        # Apply changes
        assert biq.operation_apply().is_enabled() is True, 'Apply button is not enabled'
        click(biq.operation_apply())

        # Check listings that changes were applied
        actual_listings = biq.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)
        assert biq.operation_apply().is_enabled() is False, 'Apply button is enabled'

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, biq.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert biq.is_part_modified('Quantity') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(biq.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, biq.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert biq.is_part_modified('Quantity') is False, 'Blue dot is still shown'

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, DB_INITIAL_VARIATION_PROPERTIES, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

        # --------------------------------------------------------------------------------

    def test_inventory_decrease_quantity(self):
        """ Tests that a quantity can be decreased in bulk edit
        """
        expected_listings_02 = {
            'Product #1 without variations': '45',
            'Product #2 with one variation with pricing': '11',
            'Product #3 with two variations with quantity on both and pricing on both': [
                ('XXS US Women\'s', 'Material 1', '1'),
                ('XXS US Women\'s', 'Material 2', '2'),
                ('XXS US Women\'s', 'Material 3', '3'),
                ('One size (plus) US Women\'s', 'Material 1', '4'),
                ('One size (plus) US Women\'s', 'Material 2', '5'),
                ('One size (plus) US Women\'s', 'Material 3', '6'),
                ('Custom size 1 US Women\'s', 'Material 1', '7'),
                ('Custom size 1 US Women\'s', 'Material 2', '8'),
                ('Custom size 1 US Women\'s', 'Material 3', '9')
            ]
        }


        expected_listings_03 = {
            'Product #1 without variations': '10',
            'Product #2 with one variation with pricing': '11',
            'Product #3 with two variations with quantity on both and pricing on both': [
                ('XXS US Women\'s', 'Material 1', '99'),
                ('XXS US Women\'s', 'Material 2', '99'),
                ('XXS US Women\'s', 'Material 3', '99'),
                ('One size (plus) US Women\'s', 'Material 1', '99'),
                ('One size (plus) US Women\'s', 'Material 2', '99'),
                ('One size (plus) US Women\'s', 'Material 3', '99'),
                ('Custom size 1 US Women\'s', 'Material 1', '99'),
                ('Custom size 1 US Women\'s', 'Material 2', '99'),
                ('Custom size 1 US Women\'s', 'Material 3', '99'),
            ]
        }
        operation = 'Decrease By'

        biq = BulkPageInventoryQuantity(self.driver, self.ts)
        sleep(1)
        actual_listings = biq.listing_details()
        sleep(1)
        self.check_listing_options(actual_listings, expected_listings_01)

        # unselect 2nd
        biq.click_on_listings(['Product #2 with one variation with pricing'])
        biq.select_operation(operation)

        input_field = biq.operation_input()
        input_field.clear()
        send_keys(input_field, '5')

        # Apply changes
        # include negative scenario
        click(biq.operation_apply())
        sleep(0.5)
        actual_listings = biq.listing_details()
        self.check_listing_options(actual_listings, expected_listings_02)

        assert biq.operation_apply().is_enabled() is False, 'Apply button is enabled'

        # Change individual quantity, make sure bulk still works
        row = biq.listing_row('Product #1 without variations')
        assert biq.product_quantity_text(row) == '45'
        biq.set_individual_quantity(row, '10')

        # bulk
        operation = 'Change To'
        biq.select_operation(operation)
        input_field = biq.operation_input_dolars()

        send_keys(input_field, '99')

        click(biq.operation_apply())
        wait_for_web_assert(False, biq.operation_apply().is_enabled, 'Apply button is enabled')

        actual_listings = biq.listing_details()
        self.check_listing_options(actual_listings, expected_listings_03)

    def test_inventory_quantity_non_visible_offerings(self):
        """ Test verifies that non visible offerings are marked as non visible in UI
        """

        expected_visibilities = [True, True, True, True, False, True, True, True, True]

        biq = BulkPageInventoryQuantity(self.driver, self.ts)
        row = biq.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        assert biq.options_visibility(row) == expected_visibilities, 'Visibility of offerings is not set as expected'
