# /usr/bin/env python

import pytest
from time import sleep
from selenium.webdriver.common.keys import Keys
from tests.base import BaseTestClass, BACKSPACE_KEYS, run_sql
from fixtures.fixtures import login, reload, select_listings_to_edit, test_id, rabbit_init
from pages.bulk_page_inventory_variations import BulkPageInventoryVariations
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from modules.testing import wait_for_assert
from tests.variations import check_etsy_emulator_requests, check_db_state
from flaky import flaky


def check_simplified_preview(bpiv: BulkPageInventoryVariations):
    expected_titles = [
        'Product #1 without variations\nBulk edits will replace existing categories and variations',
        'Product #2 with one variation with pricing\nBulk edits will replace existing categories and variations',
        'Product #3 with two variations with quantity on both and pricing on both\nBulk edits will replace existing categories and variations'
    ]

    row_texts = [row.text for row in bpiv.listing_rows()]
    assert row_texts == expected_titles, 'Listing rows texts don\'t match listing titles'


def check_variations(bpiv: BulkPageInventoryVariations,
                     row, exp_prop1=None, exp_prop2=None, exp_catg_texts=None):
    if exp_catg_texts:
        assert bpiv.category_texts(row) == exp_catg_texts, 'Incorrect category'

    if exp_prop1:
        assert bpiv.property_settings_texts(row, 0) == exp_prop1['settings'], \
            'Incorrect first property settings'
        assert bpiv.options_names_texts(row, 0) == exp_prop1['options'], \
            'Incorrect variation options for first property'

    if exp_prop2:
        assert bpiv.property_settings_texts(row, 1) == exp_prop2['settings'], \
            'Incorrect second property settings'
        assert bpiv.options_names_texts(row, 1) == exp_prop2['options'], \
            'Incorrect variation options for second property'

def check_bulk_properties_disabled(bpiv: BulkPageInventoryVariations):
    assert bpiv.operation_apply().is_enabled() is False, 'Apply button is enabled'
    assert bpiv.bulk_edit_row.text == 'VariationsPriceQuantitySKUVisibility\nChoose Category Above'


@pytest.mark.usefixtures("test_status", "test_id", "rabbit_init", "reload", "login", "select_listings_to_edit")
@flaky
class TestBulkInventoryVariations1(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.sql_file = 'listings_13'    # will be loaded by 'reload' fixture
        self.listings_to_select = 'ALL'   # used by select_listings_to_edit fixture
        self.listing_status = 'Active'    # used by select_listings_to_edit fixture
        self.bulk_tab = 'Variations'     # used by select_listings_to_edit fixture

    # --- Tests ---

    def test_bulk_inventory_variations_controls(self):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Variation properties in Inventory UI
        For more info see HIVE-1006 and HIVE-1018
        """

        category = ['Home & Living', 'Furniture']

        expected_tab_names = ['Variations', 'Price', 'Quantity', 'SKU', 'Visibility']

        expected_first_variation = {
            'settings': ['Diameter', 'Centimeters'],
            'options': ['10 Centimeters', '20 Centimeters']
        }

        expected_second_variation = {
            'settings': ['Color (primary)'],
            'options': ['Blue', 'Custom Color']
        }

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # ---- Check behaviour of bulk editor when no properties are set yet ----

        check_bulk_properties_disabled(bpiv)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        # Inventory tabs should be visible now - check tab names in the bulk editor
        assert bpiv.inventory_tabs_texts(bulk_row) == expected_tab_names
        # First property box contains only property dropdown
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'
        # Second property box contains only no property text
        assert bpiv.property_box(bulk_row, 1).text == 'No second property'

        # --- Check preview on listings when no properties are set yet ---

        # First check count of listing in preview
        listing_rows = bpiv.listing_rows()
        assert len(listing_rows) == 3, 'Invalid count of listings'

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # --- Continue with choosing properties in bulk editor ---

        # Set first variation property without its mandatory scale and check error message
        bpiv.set_property(bulk_row, 0, 'Diameter')
        box = bpiv.property_box(bulk_row, 0)
        assert bpiv.error_baloon_texts(box) == ['Choose a valid property/scale combination'],\
            'Expected error message is not shown'

        # set first variation property with its scale and check error message
        bpiv.set_property(bulk_row, 0, 'Diameter', 'Centimeters')
        wait_for_web_assert(['Must have at least one option'],
                            lambda: bpiv.error_baloon_texts(bpiv.property_box(bulk_row, 0)),
                            'Expected error message is not shown')

        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, '10')
        bpiv.add_custom_option(bulk_row, 0, '20')
        # Second property box contains only dropdown and no property text
        assert bpiv.property_box(bulk_row, 1).text == 'No second property\nChoose Property'

        # set second variation property
        bpiv.set_property(bulk_row, 1, 'Color (primary)')
        # Second property doesn't contain the no property message anymore
        assert 'No second property' not in bpiv.property_box(bulk_row, 1).text

        # Add two options to second property
        bpiv.add_option(bulk_row, 1, 'Blue')
        bpiv.add_custom_option(bulk_row, 1, 'Custom Color')

        # Check bulk area - variation property settings and variation options
        check_variations(bpiv, bulk_row, expected_first_variation, expected_second_variation)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

    def test_bulk_inventory_variations_apply(self):
        """ Test verifies behaviour of Apply button, Sync button and blue dot during bulk edit operation
        of Variation properties in Inventory UI
        For more info see HIVE-1006 and HIVE-1018
        """

        category = ['Accessories', 'Baby Accessories']

        expected_first_variation = {
            'settings': ['Color (primary)'],
            'options': ['Custom Color 1', 'Beige']
        }

        expected_second_variation = {
            'settings': ['Color (secondary)'],
            'options': ['Custom Color 2', 'Rose gold']
        }

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # ---- Select category in bulk edit area and check apply button that it is enabled ----

        # Apply button is disabled
        assert bpiv.operation_apply().is_enabled() is False, 'Apply button is not disabled'

        # Select category in bulk edit area and check apply button that it is still disabled
        bpiv.select_category(category)
        assert bpiv.operation_apply().is_enabled() is True, 'Apply button is not enabled'

        # --- Check Apply button behaviour for the first property ---

        # Select first property, apply button is disabled
        bulk_row = bpiv.bulk_edit_row
        bpiv.set_property(bulk_row, 0, 'Color (primary)')
        assert bpiv.operation_apply().is_enabled() is False, 'Apply button is not disabled'

        # Select first option, apply button is enabled
        bpiv.add_custom_option(bulk_row, 0, 'Custom Color 1')
        assert bpiv.operation_apply().is_enabled() is True, 'Apply button is not enabled'

        # Select second option, apply button is still enabled
        bpiv.add_option(bulk_row, 0, 'Beige')
        assert bpiv.operation_apply().is_enabled() is True, 'Apply button is not enabled'

        # --- Check Apply button behaviour for the second property ---

        # Select second property, apply button is disabled again
        bpiv.set_property(bulk_row, 1, 'Color (secondary)')
        assert bpiv.operation_apply().is_enabled() is False, 'Apply button is not disabled'

        # Select first option, apply button is enabled
        bpiv.add_custom_option(bulk_row, 1, 'Custom Color 2')
        assert bpiv.operation_apply().is_enabled() is True, 'Apply button is not enabled'

        # Select second option, Apply button is still enabled
        bpiv.add_option(bulk_row, 1, 'Rose gold')
        assert bpiv.operation_apply().is_enabled() is True, 'Apply button is not enabled'

        # ---- Check both bulk edit area and preview on listings ----

        # Check bulk edit area
        check_variations(bpiv, bulk_row, expected_first_variation, expected_second_variation)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # --- Click on apply, check sync button and blue dot ---

        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True,
                            lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # --- Check Apply button (disabled), bulk edit (default values) are and listings (updated) ---

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # check updated listings
        listing_rows = bpiv.listing_rows()
        for listing_row in listing_rows:
            check_variations(bpiv, listing_row, expected_first_variation, expected_second_variation, category)

    def test_bulk_inventory_change_variations_only(self):
        """ Test verifies that bulk change of variations without any setting of price, quantity and sku reflects
        correctly on listings. For more info and the logic see HIVE-1006.
        """

        category = ['Weddings', 'Accessories', 'Hats']

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', 'Style1', '1', '', ''],
            ['1', '500.00', '550', '50', 't', 'Style2', '2', '', ''],
            ['2', '1.00', '111', '11', 't', 'Style1', '1', '', ''],
            ['2', '1.00', '111', '11', 't', 'Style2', '2', '', ''],
            ['3', '10.00', '222', '45', 't', 'Style1', '1', '', ''],
            ['3', '10.00', '222', '45', 't', 'Style2', '2', '', ''],
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # ---- Select category, var. property and its options ----

        bpiv.select_category(category)

        # Set first property
        bulk_row = bpiv.bulk_edit_row
        bpiv.set_property(bulk_row, 0, 'Style')
        bpiv.add_custom_option(bulk_row, 0, 'Style1')
        bpiv.add_custom_option(bulk_row, 0, 'Style2')

        # ---- Check price input in bulk editor, prices on listings - preview ----

        bpiv.select_inventory_tab(bulk_row, "Price")

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # ---- Check quantity input in bulk editor, quantity on listings - preview ----

        bpiv.select_inventory_tab(bulk_row, "Quantity")

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # ---- Check SKU input in bulk editor and SKU on listings - preview ----

        bpiv.select_inventory_tab(bulk_row, "SKU")

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # --- Apply, sync and check product offerings in DB ---

        click(bpiv.operation_apply())
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        click(bpiv.sync_updates_button())

        wait_for_assert(expected_product_offerings,
                        lambda: run_sql('HIVE', 'select_product_offerings_short', True),
                        'Product offerings in DB are incorrect')

    @pytest.mark.parametrize(('property_number'), [0, 1])
    def test_bulk_inventory_single_price_individual(self, property_number):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Price in Inventory UI
        """
        category = ['Home & Living', 'Furniture']

        expected_left_bulk_header = 'Individual Pricing'

        new_prices = ['23.50', '200']

        expected_product_offerings = [
            [
                ['1', '23.50', '550', '50', 't', 'wool', '1', 'Black', '1'],
                ['1', '23.50', '550', '50', 't', 'wool', '1', 'White', '2'],
                ['1', '200.00', '550', '50', 't', 'cotton', '2', 'Black', '1'],
                ['1', '200.00', '550', '50', 't', 'cotton', '2', 'White', '2'],
                ['2', '23.50', '111', '11', 't', 'wool', '1', 'Black', '1'],
                ['2', '23.50', '111', '11', 't', 'wool', '1', 'White', '2'],
                ['2', '200.00', '111', '11', 't', 'cotton', '2', 'Black', '1'],
                ['2', '200.00', '111', '11', 't', 'cotton', '2', 'White', '2'],
                ['3', '23.50', '222', '45', 't', 'wool', '1', 'Black', '1'],
                ['3', '23.50', '222', '45', 't', 'wool', '1', 'White', '2'],
                ['3', '200.00', '222', '45', 't', 'cotton', '2', 'Black', '1'],
                ['3', '200.00', '222', '45', 't', 'cotton', '2', 'White', '2']
            ],
            [
                ['1', '23.50', '550', '50', 't', 'wool', '1', 'Black', '1'],
                ['1', '200.00', '550', '50', 't', 'wool', '1', 'White', '2'],
                ['1', '23.50', '550', '50', 't', 'cotton', '2', 'Black', '1'],
                ['1', '200.00', '550', '50', 't', 'cotton', '2', 'White', '2'],
                ['2', '23.50', '111', '11', 't', 'wool', '1', 'Black', '1'],
                ['2', '200.00', '111', '11', 't', 'wool', '1', 'White', '2'],
                ['2', '23.50', '111', '11', 't', 'cotton', '2', 'Black', '1'],
                ['2', '200.00', '111', '11', 't', 'cotton', '2', 'White', '2'],
                ['3', '23.50', '222', '45', 't', 'wool', '1', 'Black', '1'],
                ['3', '200.00', '222', '45', 't', 'wool', '1', 'White', '2'],
                ['3', '23.50', '222', '45', 't', 'cotton', '2', 'Black', '1'],
                ['3', '200.00', '222', '45', 't', 'cotton', '2', 'White', '2']
            ]
        ]

        expected_variation_properties = [
            [
                ['1', 't', '502', 'Fabric', '', 't', 'f', 'f'],
                ['1', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f'],
                ['2', 't', '502', 'Fabric', '', 't', 'f', 'f'],
                ['2', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f'],
                ['3', 't', '502', 'Fabric', '', 't', 'f', 'f'],
                ['3', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f']
            ],
            [
                ['1', 't', '502', 'Fabric', '', 'f', 'f', 'f'],
                ['1', 'f', '200', 'Color (primary)', '', 't', 'f', 'f'],
                ['2', 't', '502', 'Fabric', '', 'f', 'f', 'f'],
                ['2', 'f', '200', 'Color (primary)', '', 't', 'f', 'f'],
                ['3', 't', '502', 'Fabric', '', 'f', 'f', 'f'],
                ['3', 'f', '200', 'Color (primary)', '', 't', 'f', 'f']
            ]
        ]

        expected_variation_options = [
            [
                ['1', 't', '', 'wool', '1'],
                ['1', 't', '', 'cotton', '2'],
                ['1', 'f', '1', 'Black', '1'],
                ['1', 'f', '10', 'White', '2'],
                ['2', 't', '', 'wool', '1'],
                ['2', 't', '', 'cotton', '2'],
                ['2', 'f', '1', 'Black', '1'],
                ['2', 'f', '10', 'White', '2'],
                ['3', 't', '', 'wool', '1'],
                ['3', 't', '', 'cotton', '2'],
                ['3', 'f', '1', 'Black', '1'],
                ['3', 'f', '10', 'White', '2']
            ],
            [
                ['1', 't', '', 'wool', '1'],
                ['1', 't', '', 'cotton', '2'],
                ['1', 'f', '1', 'Black', '1'],
                ['1', 'f', '10', 'White', '2'],
                ['2', 't', '', 'wool', '1'],
                ['2', 't', '', 'cotton', '2'],
                ['2', 'f', '1', 'Black', '1'],
                ['2', 'f', '10', 'White', '2'],
                ['3', 't', '', 'wool', '1'],
                ['3', 't', '', 'cotton', '2'],
                ['3', 'f', '1', 'Black', '1'],
                ['3', 'f', '10', 'White', '2']
            ]
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Fabric')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, 'wool')
        bpiv.add_custom_option(bulk_row, 0, 'cotton')

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Color (primary)')
        # Add two options to first property, one by one
        bpiv.add_option(bulk_row, 1, 'Black')
        bpiv.add_option(bulk_row, 1, 'White')

        bpiv.select_inventory_tab(bulk_row, "Price")

        # Switch to individual prices, check the header is changed
        click(bpiv.bulk_header_checkbox(bulk_row, i=property_number), delay=0.5)
        assert bpiv.bulk_edit_row_header_text(bulk_row, i=0) == expected_left_bulk_header  # no global price input

        # Enter individual prices
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=property_number)
        for i, price in enumerate(new_prices):
            send_keys(inputs[i], str(price) + Keys.RETURN)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings[property_number],
                       expected_variation_properties[property_number],
                       expected_variation_options[property_number])


    @pytest.mark.parametrize('property_number', [0, 1])
    def test_bulk_inventory_single_quantity_individual(self, property_number):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Quantity in Inventory UI
        """
        category = ['Home & Living', 'Furniture']

        expected_left_bulk_header = 'Individual Quantity'

        new_quantities = ['22', '33']

        expected_product_offerings = [
            [
                ['1', '500.00', '550', '22', 't', 'wool', '1', 'Black', '1'],
                ['1', '500.00', '550', '22', 't', 'wool', '1', 'White', '2'],
                ['1', '500.00', '550', '33', 't', 'cotton', '2', 'Black', '1'],
                ['1', '500.00', '550', '33', 't', 'cotton', '2', 'White', '2'],
                ['2', '1.00', '111', '22', 't', 'wool', '1', 'Black', '1'],
                ['2', '1.00', '111', '22', 't', 'wool', '1', 'White', '2'],
                ['2', '1.00', '111', '33', 't', 'cotton', '2', 'Black', '1'],
                ['2', '1.00', '111', '33', 't', 'cotton', '2', 'White', '2'],
                ['3', '10.00', '222', '22', 't', 'wool', '1', 'Black', '1'],
                ['3', '10.00', '222', '22', 't', 'wool', '1', 'White', '2'],
                ['3', '10.00', '222', '33', 't', 'cotton', '2', 'Black', '1'],
                ['3', '10.00', '222', '33', 't', 'cotton', '2', 'White', '2']
            ],
            [
                ['1', '500.00', '550', '22', 't', 'wool', '1', 'Black', '1'],
                ['1', '500.00', '550', '33', 't', 'wool', '1', 'White', '2'],
                ['1', '500.00', '550', '22', 't', 'cotton', '2', 'Black', '1'],
                ['1', '500.00', '550', '33', 't', 'cotton', '2', 'White', '2'],
                ['2', '1.00', '111', '22', 't', 'wool', '1', 'Black', '1'],
                ['2', '1.00', '111', '33', 't', 'wool', '1', 'White', '2'],
                ['2', '1.00', '111', '22', 't', 'cotton', '2', 'Black', '1'],
                ['2', '1.00', '111', '33', 't', 'cotton', '2', 'White', '2'],
                ['3', '10.00', '222', '22', 't', 'wool', '1', 'Black', '1'],
                ['3', '10.00', '222', '33', 't', 'wool', '1', 'White', '2'],
                ['3', '10.00', '222', '22', 't', 'cotton', '2', 'Black', '1'],
                ['3', '10.00', '222', '33', 't', 'cotton', '2', 'White', '2']
            ]
        ]

        expected_variation_properties = [
            [
                ['1', 't', '502', 'Fabric', '', 'f', 't', 'f'],
                ['1', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f'],
                ['2', 't', '502', 'Fabric', '', 'f', 't', 'f'],
                ['2', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f'],
                ['3', 't', '502', 'Fabric', '', 'f', 't', 'f'],
                ['3', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f']
            ],
            [
                ['1', 't', '502', 'Fabric', '', 'f', 'f', 'f'],
                ['1', 'f', '200', 'Color (primary)', '', 'f', 't', 'f'],
                ['2', 't', '502', 'Fabric', '', 'f', 'f', 'f'],
                ['2', 'f', '200', 'Color (primary)', '', 'f', 't', 'f'],
                ['3', 't', '502', 'Fabric', '', 'f', 'f', 'f'],
                ['3', 'f', '200', 'Color (primary)', '', 'f', 't', 'f']
            ]
        ]

        expected_variation_options = [
            [
                ['1', 't', '', 'wool', '1'],
                ['1', 't', '', 'cotton', '2'],
                ['1', 'f', '1', 'Black', '1'],
                ['1', 'f', '10', 'White', '2'],
                ['2', 't', '', 'wool', '1'],
                ['2', 't', '', 'cotton', '2'],
                ['2', 'f', '1', 'Black', '1'],
                ['2', 'f', '10', 'White', '2'],
                ['3', 't', '', 'wool', '1'],
                ['3', 't', '', 'cotton', '2'],
                ['3', 'f', '1', 'Black', '1'],
                ['3', 'f', '10', 'White', '2']
            ],
            [
                ['1', 't', '', 'wool', '1'],
                ['1', 't', '', 'cotton', '2'],
                ['1', 'f', '1', 'Black', '1'],
                ['1', 'f', '10', 'White', '2'],
                ['2', 't', '', 'wool', '1'],
                ['2', 't', '', 'cotton', '2'],
                ['2', 'f', '1', 'Black', '1'],
                ['2', 'f', '10', 'White', '2'],
                ['3', 't', '', 'wool', '1'],
                ['3', 't', '', 'cotton', '2'],
                ['3', 'f', '1', 'Black', '1'],
                ['3', 'f', '10', 'White', '2']
            ]
        ]


        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Fabric')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, 'wool')
        bpiv.add_custom_option(bulk_row, 0, 'cotton')

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Color (primary)')
        # Add two options to first property, one by one
        bpiv.add_option(bulk_row, 1, 'Black')
        bpiv.add_option(bulk_row, 1, 'White')

        bpiv.select_inventory_tab(bulk_row, "Quantity")

        # Switch to individual quantities, check the header is changed
        click(bpiv.bulk_header_checkbox(bulk_row, i=property_number), delay=0.5)
        assert bpiv.bulk_edit_row_header_text(bulk_row, i=0) == expected_left_bulk_header

        # Enter individual quantities
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=property_number)
        for i, quantity in enumerate(new_quantities):
            send_keys(inputs[i], str(quantity) + Keys.RETURN)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings[property_number],
                       expected_variation_properties[property_number],
                       expected_variation_options[property_number])


    @pytest.mark.parametrize(('property_number'), [0, 1])
    def test_bulk_inventory_single_sku_individual(self, property_number):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of SKU in Inventory UI
        """
        category = ['Home & Living', 'Furniture']

        expected_left_bulk_header = 'Individual SKU'

        new_skus = ['W4C1', '']  # sku is optional, test also empty value

        expected_product_offerings = [
            [
                ['1', '500.00', 'W4C1', '50', 't', '10', '1', 'Black', '1'],
                ['1', '500.00', 'W4C1', '50', 't', '10', '1', 'White', '2'],
                ['1', '500.00', '', '50', 't', '20', '2', 'Black', '1'],
                ['1', '500.00', '', '50', 't', '20', '2', 'White', '2'],
                ['2', '1.00', 'W4C1', '11', 't', '10', '1', 'Black', '1'],
                ['2', '1.00', 'W4C1', '11', 't', '10', '1', 'White', '2'],
                ['2', '1.00', '', '11', 't', '20', '2', 'Black', '1'],
                ['2', '1.00', '', '11', 't', '20', '2', 'White', '2'],
                ['3', '10.00', 'W4C1', '45', 't', '10', '1', 'Black', '1'],
                ['3', '10.00', 'W4C1', '45', 't', '10', '1', 'White', '2'],
                ['3', '10.00', '', '45', 't', '20', '2', 'Black', '1'],
                ['3', '10.00', '', '45', 't', '20', '2', 'White', '2']
            ],
            [
                ['1', '500.00', 'W4C1', '50', 't', '10', '1', 'Black', '1'],
                ['1', '500.00', '', '50', 't', '10', '1', 'White', '2'],
                ['1', '500.00', 'W4C1', '50', 't', '20', '2', 'Black', '1'],
                ['1', '500.00', '', '50', 't', '20', '2', 'White', '2'],
                ['2', '1.00', 'W4C1', '11', 't', '10', '1', 'Black', '1'],
                ['2', '1.00', '', '11', 't', '10', '1', 'White', '2'],
                ['2', '1.00', 'W4C1', '11', 't', '20', '2', 'Black', '1'],
                ['2', '1.00', '', '11', 't', '20', '2', 'White', '2'],
                ['3', '10.00', 'W4C1', '45', 't', '10', '1', 'Black', '1'],
                ['3', '10.00', '', '45', 't', '10', '1', 'White', '2'],
                ['3', '10.00', 'W4C1', '45', 't', '20', '2', 'Black', '1'],
                ['3', '10.00', '', '45', 't', '20', '2', 'White', '2']
            ]
        ]

        expected_variation_properties = [
            [
                ['1', 't', '504', 'Diameter', '342', 'f', 'f', 't'],
                ['1', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f'],
                ['2', 't', '504', 'Diameter', '342', 'f', 'f', 't'],
                ['2', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f'],
                ['3', 't', '504', 'Diameter', '342', 'f', 'f', 't'],
                ['3', 'f', '200', 'Color (primary)', '', 'f', 'f', 'f']
            ],
            [
                ['1', 't', '504', 'Diameter', '342', 'f', 'f', 'f'],
                ['1', 'f', '200', 'Color (primary)', '', 'f', 'f', 't'],
                ['2', 't', '504', 'Diameter', '342', 'f', 'f', 'f'],
                ['2', 'f', '200', 'Color (primary)', '', 'f', 'f', 't'],
                ['3', 't', '504', 'Diameter', '342', 'f', 'f', 'f'],
                ['3', 'f', '200', 'Color (primary)', '', 'f', 'f', 't']
            ]
        ]

        expected_variation_options = [
            [
                ['1', 't', '', '10', '1'],
                ['1', 't', '', '20', '2'],
                ['1', 'f', '1', 'Black', '1'],
                ['1', 'f', '10', 'White', '2'],
                ['2', 't', '', '10', '1'],
                ['2', 't', '', '20', '2'],
                ['2', 'f', '1', 'Black', '1'],
                ['2', 'f', '10', 'White', '2'],
                ['3', 't', '', '10', '1'],
                ['3', 't', '', '20', '2'],
                ['3', 'f', '1', 'Black', '1'],
                ['3', 'f', '10', 'White', '2']
            ],
            [
                ['1', 't', '', '10', '1'],
                ['1', 't', '', '20', '2'],
                ['1', 'f', '1', 'Black', '1'],
                ['1', 'f', '10', 'White', '2'],
                ['2', 't', '', '10', '1'],
                ['2', 't', '', '20', '2'],
                ['2', 'f', '1', 'Black', '1'],
                ['2', 'f', '10', 'White', '2'],
                ['3', 't', '', '10', '1'],
                ['3', 't', '', '20', '2'],
                ['3', 'f', '1', 'Black', '1'],
                ['3', 'f', '10', 'White', '2']
            ]
        ]


        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Diameter', 'Centimeters')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, '10')
        bpiv.add_custom_option(bulk_row, 0, '20')

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Color (primary)')
        # Add two options to first property, one by one
        bpiv.add_option(bulk_row, 1, 'Black')
        bpiv.add_option(bulk_row, 1, 'White')

        bpiv.select_inventory_tab(bulk_row, "SKU")

        # Switch to individual prices, check the header is changed
        click(bpiv.bulk_header_checkbox(bulk_row, i=property_number), delay=0.5)
        assert bpiv.bulk_edit_row_header_text(bulk_row, i=0) == expected_left_bulk_header

        # Enter individual SKU
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=property_number)
        for i, sku in enumerate(new_skus):
            send_keys(inputs[i], str(sku) + Keys.RETURN)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings[property_number],
                       expected_variation_properties[property_number],
                       expected_variation_options[property_number])

    def test_bulk_inventory_single_visibility(self):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Visibility in Inventory UI
        """
        category = ['Home & Living', 'Furniture']

        new_visibility = [True, True, False]

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '10', '1', '', ''],
            ['1', '500.00', '550', '50', 't', '20', '2', '', ''],
            ['1', '500.00', '550', '50', 'f', '30', '3', '', ''],
            ['2', '1.00', '111', '11', 't', '10', '1', '', ''],
            ['2', '1.00', '111', '11', 't', '20', '2', '', ''],
            ['2', '1.00', '111', '11', 'f', '30', '3', '', ''],
            ['3', '10.00', '222', '45', 't', '10', '1', '', ''],
            ['3', '10.00', '222', '45', 't', '20', '2', '', ''],
            ['3', '10.00', '222', '45', 'f', '30', '3', '', '']
        ]

        expected_variation_properties = [
            ['1', 't', '504', 'Diameter', '342', 'f', 'f', 'f'],
            ['2', 't', '504', 'Diameter', '342', 'f', 'f', 'f'],
            ['3', 't', '504', 'Diameter', '342', 'f', 'f', 'f']
        ]

        expected_variation_options = [
            ['1', 't', '', '10', '1'],
            ['1', 't', '', '20', '2'],
            ['1', 't', '', '30', '3'],
            ['2', 't', '', '10', '1'],
            ['2', 't', '', '20', '2'],
            ['2', 't', '', '30', '3'],
            ['3', 't', '', '10', '1'],
            ['3', 't', '', '20', '2'],
            ['3', 't', '', '30', '3']
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Diameter', 'Centimeters')

        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, '10')
        bpiv.add_custom_option(bulk_row, 0, '20')
        bpiv.add_custom_option(bulk_row, 0, '30')

        bpiv.select_inventory_tab(bulk_row, "Visibility")
        sleep(1)

        # Enter individual visibility
        toggles = bpiv.bulk_individual_option_toggles(bulk_row, i=0)
        for i, visibility in enumerate(new_visibility):
            if not visibility:
                click(toggles[i])   # make this item invisible

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)

    def test_bulk_inventory_price_combined(self):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Price in Inventory UI - combination of 2 properties
        """
        category = ['Home & Living', 'Furniture']

        expected_left_bulk_header = 'Individual Pricing'

        new_prices = ['23.50', '200', '250', '300']

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', '111', '11', 't', 'Beige', '1', '', ''],
            ['2', '2.00', '111', '11', 't', 'Black', '2', '', ''],
            ['2', '3.00', '111', '11', 'f', 'Blue', '3', '', ''],
            ['2', '4.00', '111', '11', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', '111', '11', 't', 'White', '5', '', ''],
            ['2', '6.00', '111', '11', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', '111', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', '111', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '10.00', '222', '1', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '20.00', '222', '2', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '30.00', '222', '3', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '40.00', '222', '4', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '50.00', '222', '5', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '60.00', '222', '6', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '70.00', '222', '7', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '80.00', '222', '8', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '90.00', '222', '9', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        expected_variation_properties = [
            ['2', 't', '200', 'Primary color', '', 't', 'f', 'f'],
            ['3', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['3', 'f', '507', 'Material', '', 't', 't', 'f']
        ]

        expected_variation_options = [
            ['2', 't', '1213', 'Beige', '1'],
            ['2', 't', '1', 'Black', '2'],
            ['2', 't', '2', 'Blue', '3'],
            ['2', 't', '1215', 'Silver', '4'],
            ['2', 't', '10', 'White', '5'],
            ['2', 't', '11', 'Yellow', '6'],
            ['2', 't', '105393734419', 'Custom color 1', '7'],
            ['2', 't', '50541869803', 'Custom color 2', '8'],
            ['3', 't', '1672', 'XXS', '1'],
            ['3', 't', '1795', 'One size (plus)', '2'],
            ['3', 't', '102314214578', 'Custom size 1', '3'],
            ['3', 'f', '5561256091', 'Material 1', '1'],
            ['3', 'f', '5561256101', 'Material 2', '2'],
            ['3', 'f', '9932879796', 'Material 3', '3']
        ]

        from data.test_bulk_inventory_price_combined_expected_data import expected_api_calls

        self.set_etsy_testcase('listings_push_inventory')

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Fabric')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, 'wool')
        bpiv.add_custom_option(bulk_row, 0, 'cotton')

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Color (primary)')
        # Add two options to first property, one by one
        bpiv.add_option(bulk_row, 1, 'Black')
        bpiv.add_option(bulk_row, 1, 'White')

        bpiv.select_inventory_tab(bulk_row, "Price")

        # Switch to individual prices, check the header is changed
        click(bpiv.bulk_header_checkbox(bulk_row, i=0))
        click(bpiv.bulk_header_checkbox(bulk_row, i=1), delay=0.5)
        assert bpiv.bulk_edit_row_header_text(bulk_row, i=0) == expected_left_bulk_header  # no global price input

        # Enter individual prices for the property combinations
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=0)
        for i, price in enumerate(new_prices):
            send_keys(inputs[i], str(price) + Keys.RETURN)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)

        # Check Etsy API calls
        check_etsy_emulator_requests(expected_api_calls)

    def test_bulk_inventory_quantity_combined(self):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Quantity in Inventory UI - combination of 2 properties
        """
        category = ['Clothing', 'Unisex Adult Clothing', 'Pants']

        expected_left_bulk_header = 'Individual Quantity'

        new_quantities = ['200', '300', '400', '500']

        expected_product_offerings = [
            ['1', '500.00', '550', '200', 't', 'L', '1', 'Black', '1'],
            ['1', '500.00', '550', '300', 't', 'L', '1', 'Pinkish', '2'],
            ['1', '500.00', '550', '400', 't', 'M', '2', 'Black', '1'],
            ['1', '500.00', '550', '500', 't', 'M', '2', 'Pinkish', '2'],
            ['2', '1.00', '111', '200', 't', 'L', '1', 'Black', '1'],
            ['2', '1.00', '111', '300', 't', 'L', '1', 'Pinkish', '2'],
            ['2', '1.00', '111', '400', 't', 'M', '2', 'Black', '1'],
            ['2', '1.00', '111', '500', 't', 'M', '2', 'Pinkish', '2'],
            ['3', '10.00', '222', '200', 't', 'L', '1', 'Black', '1'],
            ['3', '10.00', '222', '300', 't', 'L', '1', 'Pinkish', '2'],
            ['3', '10.00', '222', '400', 't', 'M', '2', 'Black', '1'],
            ['3', '10.00', '222', '500', 't', 'M', '2', 'Pinkish', '2']
        ]

        expected_variation_properties = [
            ['1', 't', '62809790503', 'Size', '49', 'f', 't', 'f'],
            ['1', 'f', '200', 'Color (primary)', '', 'f', 't', 'f'],
            ['2', 't', '62809790503', 'Size', '49', 'f', 't', 'f'],
            ['2', 'f', '200', 'Color (primary)', '', 'f', 't', 'f'],
            ['3', 't', '62809790503', 'Size', '49', 'f', 't', 'f'],
            ['3', 'f', '200', 'Color (primary)', '', 'f', 't', 'f']
        ]

        expected_variation_options = [
            ['1', 't', '2119', 'L', '1'],
            ['1', 't', '2116', 'M', '2'],
            ['1', 'f', '1', 'Black', '1'],
            ['1', 'f', '', 'Pinkish', '2'],
            ['2', 't', '2119', 'L', '1'],
            ['2', 't', '2116', 'M', '2'],
            ['2', 'f', '1', 'Black', '1'],
            ['2', 'f', '', 'Pinkish', '2'],
            ['3', 't', '2119', 'L', '1'],
            ['3', 't', '2116', 'M', '2'],
            ['3', 'f', '1', 'Black', '1'],
            ['3', 'f', '', 'Pinkish', '2']
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Size', "Men's")
        # Add two options to first property, one by one
        bpiv.add_option(bulk_row, 0, 'L', displayed_name="L Men's")
        bpiv.add_option(bulk_row, 0, 'M', displayed_name="M Men's")

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Color (primary)')
        # Add two options to first property, one by one
        bpiv.add_option(bulk_row, 1, 'Black')
        bpiv.add_custom_option(bulk_row, 1, 'Pinkish')

        bpiv.select_inventory_tab(bulk_row, "Quantity")

        # Switch to individual quantities, check the header is changed
        click(bpiv.bulk_header_checkbox(bulk_row, i=0))
        click(bpiv.bulk_header_checkbox(bulk_row, i=1), delay=0.5)
        assert bpiv.bulk_edit_row_header_text(bulk_row, i=0) == expected_left_bulk_header

        # Enter individual quantities for the property combinations
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=0)
        for i, quantity in enumerate(new_quantities):
            send_keys(inputs[i], str(quantity) + Keys.RETURN)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)

    def test_bulk_inventory_sku_combined(self):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of SKU in Inventory UI - combination of 2 properties
        """
        category = ['Toys & Games', 'Toys', 'Balls']

        expected_left_bulk_header = 'Individual SKU'

        new_skus = ['W4C1', 'W4C2', '']

        expected_product_offerings = [
            ['1', '500.00', 'W4C1', '50', 't', '300', '1', '75', '1'],
            ['1', '500.00', 'W4C2', '50', 't', '400', '2', '75', '1'],
            ['1', '500.00', '', '50', 't', '500', '3', '75', '1'],
            ['2', '1.00', 'W4C1', '11', 't', '300', '1', '75', '1'],
            ['2', '1.00', 'W4C2', '11', 't', '400', '2', '75', '1'],
            ['2', '1.00', '', '11', 't', '500', '3', '75', '1'],
            ['3', '10.00', 'W4C1', '45', 't', '300', '1', '75', '1'],
            ['3', '10.00', 'W4C2', '45', 't', '400', '2', '75', '1'],
            ['3', '10.00', '', '45', 't', '500', '3', '75', '1']
        ]

        expected_variation_properties = [
            ['1', 't', '511', 'Weight', '333', 'f', 'f', 't'],
            ['1', 'f', '504', 'Diameter', '342', 'f', 'f', 't'],
            ['2', 't', '511', 'Weight', '333', 'f', 'f', 't'],
            ['2', 'f', '504', 'Diameter', '342', 'f', 'f', 't'],
            ['3', 't', '511', 'Weight', '333', 'f', 'f', 't'],
            ['3', 'f', '504', 'Diameter', '342', 'f', 'f', 't']
        ]

        expected_variation_options = [
            ['1', 't', '', '300', '1'],
            ['1', 't', '', '400', '2'],
            ['1', 't', '', '500', '3'],
            ['1', 'f', '', '75', '1'],
            ['2', 't', '', '300', '1'],
            ['2', 't', '', '400', '2'],
            ['2', 't', '', '500', '3'],
            ['2', 'f', '', '75', '1'],
            ['3', 't', '', '300', '1'],
            ['3', 't', '', '400', '2'],
            ['3', 't', '', '500', '3'],
            ['3', 'f', '', '75', '1']
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Weight', "Grams")
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, '300')
        bpiv.add_custom_option(bulk_row, 0, '400')
        bpiv.add_custom_option(bulk_row, 0, '500')

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Diameter', 'Centimeters')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 1, '75')

        bpiv.select_inventory_tab(bulk_row, "SKU")

        # Switch to individual SKUs, check the header is changed
        click(bpiv.bulk_header_checkbox(bulk_row, i=0))
        click(bpiv.bulk_header_checkbox(bulk_row, i=1), delay=0.5)
        assert bpiv.bulk_edit_row_header_text(bulk_row, i=0) == expected_left_bulk_header

        # Enter individual SKUs for the property combinations
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=0)
        for i, sku in enumerate(new_skus):
            send_keys(inputs[i], str(sku) + Keys.RETURN)

        # Check that only titles are in listing preview as preview is disabled
        check_simplified_preview(bpiv)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)

    def test_bulk_inventory_visibility_combined(self):
        """ Test verifies behaviour of bulk editor controls and listing rows during bulk edit operation
        of Visibility in Inventory UI - combination of 2 properties
        """
        category = ['Toys & Games', 'Toys', 'Balls']
        new_visibility = [False, False, True, True]

        expected_product_offerings = [
            ['1', '500.00', 'SKU1', '50', 'f', 'Blue', '1', 'vanilla', '1'],
            ['1', '500.00', 'SKU2', '50', 'f', 'Blue', '1', 'chocolate', '2'],
            ['1', '500.00', 'SKU3', '50', 't', 'Yellow', '2', 'vanilla', '1'],
            ['1', '500.00', 'SKU4', '50', 't', 'Yellow', '2', 'chocolate', '2'],
            ['2', '1.00', 'SKU1', '11', 'f', 'Blue', '1', 'vanilla', '1'],
            ['2', '1.00', 'SKU2', '11', 'f', 'Blue', '1', 'chocolate', '2'],
            ['2', '1.00', 'SKU3', '11', 't', 'Yellow', '2', 'vanilla', '1'],
            ['2', '1.00', 'SKU4', '11', 't', 'Yellow', '2', 'chocolate', '2'],
            ['3', '10.00', 'SKU1', '45', 'f', 'Blue', '1', 'vanilla', '1'],
            ['3', '10.00', 'SKU2', '45', 'f', 'Blue', '1', 'chocolate', '2'],
            ['3', '10.00', 'SKU3', '45', 't', 'Yellow', '2', 'vanilla', '1'],
            ['3', '10.00', 'SKU4', '45', 't', 'Yellow', '2', 'chocolate', '2']
        ]

        expected_variation_properties = [
            ['1', 't', '200', 'Color (primary)', '', 'f', 'f', 't'],
            ['1', 'f', '503', 'Flavor', '', 'f', 'f', 't'],
            ['2', 't', '200', 'Color (primary)', '', 'f', 'f', 't'],
            ['2', 'f', '503', 'Flavor', '', 'f', 'f', 't'],
            ['3', 't', '200', 'Color (primary)', '', 'f', 'f', 't'],
            ['3', 'f', '503', 'Flavor', '', 'f', 'f', 't']
        ]

        expected_variation_options = [
            ['1', 't', '2', 'Blue', '1'],
            ['1', 't', '11', 'Yellow', '2'],
            ['1', 'f', '', 'vanilla', '1'],
            ['1', 'f', '', 'chocolate', '2'],
            ['2', 't', '2', 'Blue', '1'],
            ['2', 't', '11', 'Yellow', '2'],
            ['2', 'f', '', 'vanilla', '1'],
            ['2', 'f', '', 'chocolate', '2'],
            ['3', 't', '2', 'Blue', '1'],
            ['3', 't', '11', 'Yellow', '2'],
            ['3', 'f', '', 'vanilla', '1'],
            ['3', 'f', '', 'chocolate', '2']
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row
        assert bpiv.property_box(bulk_row, 0).text == 'Choose Property'

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Color (primary)')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, 'Blue')
        bpiv.add_custom_option(bulk_row, 0, 'Yellow')

        # Set second variation property
        bpiv.set_property(bulk_row, 1, 'Flavor')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 1, 'vanilla')
        bpiv.add_custom_option(bulk_row, 1, 'chocolate')

        # Switch to individual SKUs (W4C would be set for every item if global value was filled before)
        bpiv.select_inventory_tab(bulk_row, "SKU")
        click(bpiv.bulk_header_checkbox(bulk_row, i=0))
        click(bpiv.bulk_header_checkbox(bulk_row, i=1), delay=0.5)

        # Due to removed global SKU input (see above) we have to fill SKUs individually
        inputs = bpiv.bulk_individual_option_inputs(bulk_row, i=0)
        new_skus = ['SKU1', 'SKU2', 'SKU3', 'SKU4']
        for i, sku in enumerate(new_skus):
            send_keys(inputs[i], str(sku) + Keys.RETURN)

        bpiv.select_inventory_tab(bulk_row, "Visibility")

        # Enter individual visibility
        toggles = bpiv.bulk_individual_option_toggles(bulk_row, i=0)
        for i, visibility in enumerate(new_visibility):
            if not visibility:
                click(toggles[i])   # make this item invisible

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        # Check data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)

    def test_bulk_inventory_global_validations(self):
        """
        Verify that error message shows up for validations of global Price, global Quantity, global SKU and Visibility
        """
        bpiv = BulkPageInventoryVariations(self.driver, self.ts)
        bpiv.select_category(['Electronics & Accessories', 'Gadgets'])

        bulk_row = bpiv.bulk_edit_row
        bpiv.set_property(bulk_row, 0, 'Device')
        bpiv.add_option(bulk_row, 0, 'iPad Mini')
        bpiv.add_option(bulk_row, 0, 'iPhone 5')

        # --- Check Visibility tab validation ---

        # Set the first and second option to invisible - effectively all options
        bpiv.select_inventory_tab(bulk_row, 'Visibility')
        toggles = bpiv.bulk_individual_option_toggles(bulk_row, i=0)
        click(toggles[0])
        click(toggles[1])

        # Check that Apply button is disabled, Visibility tab marked invalid, correct error shown
        assert bpiv.operation_apply().is_enabled() is False, 'Apply button is enabled'
        assert bpiv.inventory_tab_error(bulk_row, 'Visibility') is True, 'Visibility tab is not marked as invalid'
        assert bpiv.header_error_text(bulk_row) == 'At least one offering must be visible', \
            'Incorrect validation error for Visibility'

        # Set first option visible again.
        click(toggles[0])

        # Check that Apply button is enabled, Visibility tab NOT marked invalid, no error shown
        assert bpiv.operation_apply().is_enabled() is True, 'Apply button is incorrectly disabled'
        assert bpiv.inventory_tab_error(bulk_row, 'Visibility') is False,\
            'Visibility tab is incorrectly marked as invalid'
        assert bpiv.header_error_text(bulk_row) == '', 'Validation error for Visibility should not be visible'

    def test_bulk_property_name_validation(self):
        """
        Verify one validation rule for variation property name input
        """
        bpiv = BulkPageInventoryVariations(self.driver, self.ts)
        bpiv.select_category(['Shoes', 'Men\'s Shoes', 'Oxfords & Wingtips'])

        bulk_row = bpiv.bulk_edit_row
        box = bpiv.property_box(bulk_row, 0)
        property_dropdown = bpiv.property_dropdown(bulk_row, 0)
        click(property_dropdown)

        # Enter invalid string into custom property name input and check: error baloon shows, Add button disabled
        property_input = bpiv.property_input(bulk_row, 0)
        send_keys(property_input, 'a$b')
        property_add_button = bpiv.property_add_button(bulk_row, 0)
        assert property_add_button.is_enabled() is False, 'Property Add Button is not disabled'
        errors = bpiv.error_baloon_texts(box)
        assert errors == ['You may not include any of these characters: ^ $ `'], \
            'Error message not displayed correctly for "a$b" property name'

        # Enter valid string into property input and check: error baloon disappears, Add button enabled
        send_keys(property_input, BACKSPACE_KEYS + 'abc')
        property_add_button = bpiv.property_add_button(bulk_row, 0)
        assert property_add_button.is_enabled() is True, 'Property Add Button is not enabled'
        errors = bpiv.error_baloon_texts(box)
        assert errors == [], 'No error should be displayed'

    def test_bulk_option_name_validation(self):
        """
        Verify some validation rules for variation option name input
        """
        bpiv = BulkPageInventoryVariations(self.driver, self.ts)
        bpiv.select_category(['Jewelry', 'Bracelets', 'Bangles'])

        bulk_row = bpiv.bulk_edit_row
        bpiv.set_property(bulk_row, 0, 'Color (primary)')
        box = bpiv.property_box(bulk_row, 0)

        # when no option is added yet check that appropriate error message is shown and Variations tab marked as invalid
        option_add_button = bpiv.option_add_button(bulk_row, 0)
        assert option_add_button.is_enabled() is False, 'Add option button is enabled and should be disabled'
        errors = bpiv.error_baloon_texts(box)
        assert errors == ['Must have at least one option'], 'Error is not displayed correctly for zero options'
        assert bpiv.inventory_tab_error(bulk_row, 'Variations') is True,\
            'Variations tab not marked as invalid'

        # add the first option and check that no error is displayed, Variations tab not marked as invalid
        bpiv.add_option(bulk_row, 0, 'Copper')
        errors = bpiv.error_baloon_texts(box)
        assert errors == [], 'No error should be displayed'
        assert bpiv.inventory_tab_error(bulk_row, 'Variations') is False,\
            'Variations tab should not be marked as invalid'

        # check validation for invalid character
        option_input = bpiv.option_input(bulk_row, 0)
        send_keys(option_input, 'a$b')
        assert option_add_button.is_enabled() is False, 'Add option button is enabled and should be disabled'
        errors = bpiv.error_baloon_texts(box)
        assert errors == ['You may not include any of these characters: ^ $ `'],\
            'Validation error not displayed for option name: a$b'

    def test_bulk_inventory_custom_properties(self):
        """
        Verify that custom properties and their options can be added to listings using bulk edit
        """

        # Select category
        bpiv = BulkPageInventoryVariations(self.driver, self.ts)
        bpiv.select_category(['Books, Movies & Music', 'Music', 'Sheet Music'])

        # Add first custom property and its options
        bulk_row = bpiv.bulk_edit_row
        bpiv.set_custom_property(bulk_row, 0, 'Custom property A')
        bpiv.add_custom_option(bulk_row, 0, 'Option A1')
        bpiv.add_custom_option(bulk_row, 0, 'Option A2')

        # Add second custom property and its options
        bpiv.set_custom_property(bulk_row, 1, 'Custom property B')
        bpiv.add_custom_option(bulk_row, 1, 'Option B1')
        bpiv.add_custom_option(bulk_row, 1, 'Option B2')

        # Apply and sync changes
        click(bpiv.operation_apply())
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        click(bpiv.sync_updates_button())

        # Check variations data in DB
        expected_data = [
            ['1', 't', '513', 'Custom property A', '', '', 'Option A1', '1'],
            ['1', 't', '513', 'Custom property A', '', '', 'Option A2', '2'],
            ['1', 'f', '514', 'Custom property B', '', '', 'Option B1', '1'],
            ['1', 'f', '514', 'Custom property B', '', '', 'Option B2', '2'],
            ['2', 't', '513', 'Custom property A', '', '', 'Option A1', '1'],
            ['2', 't', '513', 'Custom property A', '', '', 'Option A2', '2'],
            ['2', 'f', '514', 'Custom property B', '', '', 'Option B1', '1'],
            ['2', 'f', '514', 'Custom property B', '', '', 'Option B2', '2'],
            ['3', 't', '513', 'Custom property A', '', '', 'Option A1', '1'],
            ['3', 't', '513', 'Custom property A', '', '', 'Option A2', '2'],
            ['3', 'f', '514', 'Custom property B', '', '', 'Option B1', '1'],
            ['3', 'f', '514', 'Custom property B', '', '', 'Option B2', '2'],
        ]

        wait_for_assert(expected_data,
                        lambda: run_sql('HIVE', 'select_variations', True),
                        'Unexpected variations data in DB')

    def test_variations_bulk_individual_validations(self):
        """ Test verifies that individual price, quantity and sku inputs are validated
        """

        def check_tab(tab_name, expected_error_message):
            """
            Checks individual values validations on a tab
            :param tab_name: Name of the tab, i.e. 'Price'
            :param expected_error_message: Expected validation error message for invalid value '^'
            :return:
            """
            new_values = ['^', '200']

            bpiv.select_inventory_tab(bulk_row, tab_name)

            # Switch to individual values
            click(bpiv.bulk_header_checkbox(bulk_row, 0), delay=0.5)

            # Enter individual values
            inputs = bpiv.bulk_individual_option_inputs(bulk_row, 0)
            for i, value in enumerate(new_values):
                send_keys(inputs[i], str(value))

            # Check that tab is marked as invalid
            assert bpiv.inventory_tab_error(bulk_row, tab_name) is True, tab_name + ' tab is not marked as invalid'

            # Check error messages
            errors = bpiv.offering_options_errors(bulk_row, 0)
            assert errors == [expected_error_message], 'Validation error is not shown as expected'

            # Check that Apply button is disabled
            assert bpiv.operation_apply().is_enabled() is False, 'Apply button is enabled'

            # Switch back to global value
            click(bpiv.bulk_header_checkbox(bulk_row, 0), delay=0.5)

            # Check that Apply button is enabled
            assert bpiv.operation_apply().is_enabled() is True, 'Apply button is disabled'

        category = ['Paper & Party Supplies', 'Party Supplies', 'Party Décor', 'Guest Books']

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        bulk_row = bpiv.bulk_edit_row

        # Set first variation property
        bpiv.set_property(bulk_row, 0, 'Material')
        # Add two options to first property, one by one
        bpiv.add_custom_option(bulk_row, 0, 'book paper')
        bpiv.add_custom_option(bulk_row, 0, 'banana paper')

        # check validations of individual values on each tab
        check_tab('Price', 'Must be a number')
        check_tab('Quantity', 'Use a whole number between 0 and 999')
        check_tab('SKU', 'Cannot contain $^` characters')

    def test_variations_bulk_delete_variations(self):
        """ Test deletion of variations using bulk edit
        """

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', '111', '11', 't', '', '', '', ''],
            ['3', '10.00', '222', '40', 't', '', '', '', '']
        ]

        expected_variation_properties = []

        expected_variation_options = []

        category = ['Pet Supplies', 'Beekeeping']

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        # Blue dot is not displayed and sync button is disabled before clicking on Apply
        assert bpiv.is_part_modified('Variations') is False, 'Blue dot should not be visible yet'
        assert bpiv.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        # Apply
        assert bpiv.operation_apply().is_enabled() is True
        click(bpiv.operation_apply())
        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, lambda: bpiv.sync_updates_button().is_enabled(),
                            'Sync button is not enabled')
        assert bpiv.is_part_modified('Variations') is True, 'Blue dot didn\'t show up'

        # Check bulk edit area texts and that Apply button is disabled
        check_bulk_properties_disabled(bpiv)

        # Sync updates
        click(bpiv.sync_updates_button())

        wait_for_assert(expected_product_offerings,
                        lambda: run_sql('HIVE', 'select_product_offerings_short', True),
                        'Product offerings in DB are incorrect')

        variation_properties = run_sql('HIVE', 'select_variation_properties', True)
        assert variation_properties == expected_variation_properties, 'Incorrect variation properties in DB'

        variation_options = run_sql('HIVE', 'select_variation_options', True)
        assert variation_options == expected_variation_options, 'Incorrect variation options in DB'
