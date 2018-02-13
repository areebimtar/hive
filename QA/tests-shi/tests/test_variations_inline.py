import pytest
from tests.base import BaseTestClass
from fixtures.fixtures import login, reload, select_listings_to_edit, test_id, rabbit_init
from pages.bulk_page_inventory_variations import BulkPageInventoryVariations
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from flaky import flaky
from typing import List
from tests.variations import check_db_state, check_etsy_emulator_requests, DB_INITIAL_VARIATION_PROPERTIES, \
    DB_INITIAL_VARIATION_OPTIONS


def check_listings_checked(bp: BulkPageInventoryVariations, expected_checks: List[bool]):
    for i, row in enumerate(bp.listing_rows()):
        expected = expected_checks[i]
        assert bp.listing_checked_bool(row) == expected,\
            'Listing #%d is' % (i + 1) + ' not checked' if expected else ' checked'


def check_sync_button_and_dot(bp: BulkPageInventoryVariations, expected_sync_ready: bool):
    # Check the state of sync button and the blue dot
    wait_for_web_assert(expected_sync_ready, bp.sync_updates_button().is_enabled,
                        'Sync button is' + (' not' if expected_sync_ready else '') + ' disabled')
    assert bp.is_part_modified('Variations') is expected_sync_ready,\
        'Blue dot is' + (' not' if expected_sync_ready else '') + ' shown'


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

    def test_variations_inline_properties_changes(self):
        """ Test checks various changes of variation properties on all listings
         - add property, add option, delete option, ...

        :return:
        """

        expected_product_offerings = [
            ['1', '33.33', '550', '33', 't', 'Beige', '1', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Beige', '1', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Black', '2', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Black', '2', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Blue', '3', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Blue', '3', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Bronze', '4', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Bronze', '4', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Brown', '5', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Brown', '5', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Clear', '6', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Clear', '6', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Copper', '7', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Copper', '7', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Gold', '8', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Gold', '8', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Gray', '9', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Gray', '9', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Green', '10', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Green', '10', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Orange', '11', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Orange', '11', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Pink', '12', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Pink', '12', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Purple', '13', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Purple', '13', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Rainbow', '14', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Rainbow', '14', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Red', '15', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Red', '15', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Rose gold', '16', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Rose gold', '16', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Silver', '17', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Silver', '17', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'White', '18', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'White', '18', 'Levande', '2'],
            ['1', '33.33', '550', '33', 't', 'Yellow', '19', 'Blue', '1'],
            ['1', '333.33', '550', '33', 't', 'Yellow', '19', 'Levande', '2'],
            ['2', '1.00', '111', '111', 't', 'Beige', '1', '44.4', '1'],
            ['2', '1.00', '111', '222', 't', 'Beige', '1', '55.5', '2'],
            ['2', '2.00', '111', '111', 't', 'Black', '2', '44.4', '1'],
            ['2', '2.00', '111', '222', 't', 'Black', '2', '55.5', '2'],
            ['2', '3.00', '111', '111', 'f', 'Blue', '3', '44.4', '1'],
            ['2', '3.00', '111', '222', 'f', 'Blue', '3', '55.5', '2'],
            ['2', '4.00', '111', '111', 'f', 'Silver', '4', '44.4', '1'],
            ['2', '4.00', '111', '222', 'f', 'Silver', '4', '55.5', '2'],
            ['2', '5.00', '111', '111', 't', 'White', '5', '44.4', '1'],
            ['2', '5.00', '111', '222', 't', 'White', '5', '55.5', '2'],
            ['2', '6.00', '111', '111', 't', 'Yellow', '6', '44.4', '1'],
            ['2', '6.00', '111', '222', 't', 'Yellow', '6', '55.5', '2'],
            ['2', '7.00', '111', '111', 't', 'Custom color 1', '7', '44.4', '1'],
            ['2', '7.00', '111', '222', 't', 'Custom color 1', '7', '55.5', '2'],
            ['2', '11.11', '111', '111', 't', 'New Color', '8', '44.4', '1'],
            ['2', '11.11', '111', '222', 't', 'New Color', '8', '55.5', '2'],
            ['3', '40.00', '222', '4', 't', 'One size (plus)', '1', 'Material 1', '1'],
            ['3', '50.00', '222', '5', 'f', 'One size (plus)', '1', 'Material 2', '2'],
            ['3', '70.00', '222', '7', 't', 'Custom size 1', '2', 'Material 1', '1'],
            ['3', '80.00', '222', '8', 't', 'Custom size 1', '2', 'Material 2', '2']
        ]

        expected_variation_properties = [
            ['1', 't', '200', 'Color (primary)', '', 'f', 'f', 'f'],
            ['1', 'f', '52047899002', 'Color (secondary)', '', 't', 'f', 'f'],
            ['2', 't', '200', 'Primary color', '', 't', 'f', 'f'],
            ['2', 'f', '501', 'Dimensions', '344', 'f', 't', 'f'],
            ['3', 't', '52047899294', 'Size', '25', 't', 't', 'f'],
            ['3', 'f', '507', 'Material', '', 't', 't', 'f']
        ]

        expected_variation_options = [
            ['1', 't', '1213', 'Beige', '1'],
            ['1', 't', '1', 'Black', '2'],
            ['1', 't', '2', 'Blue', '3'],
            ['1', 't', '1216', 'Bronze', '4'],
            ['1', 't', '3', 'Brown', '5'],
            ['1', 't', '1219', 'Clear', '6'],
            ['1', 't', '1218', 'Copper', '7'],
            ['1', 't', '1214', 'Gold', '8'],
            ['1', 't', '5', 'Gray', '9'],
            ['1', 't', '4', 'Green', '10'],
            ['1', 't', '6', 'Orange', '11'],
            ['1', 't', '7', 'Pink', '12'],
            ['1', 't', '8', 'Purple', '13'],
            ['1', 't', '1220', 'Rainbow', '14'],
            ['1', 't', '9', 'Red', '15'],
            ['1', 't', '1217', 'Rose gold', '16'],
            ['1', 't', '1215', 'Silver', '17'],
            ['1', 't', '10', 'White', '18'],
            ['1', 't', '11', 'Yellow', '19'],
            ['1', 'f', '2', 'Blue', '1'],
            ['1', 'f', '', 'Levande', '2'],
            ['2', 't', '1213', 'Beige', '1'],
            ['2', 't', '1', 'Black', '2'],
            ['2', 't', '2', 'Blue', '3'],
            ['2', 't', '1215', 'Silver', '4'],
            ['2', 't', '10', 'White', '5'],
            ['2', 't', '11', 'Yellow', '6'],
            ['2', 't', '105393734419', 'Custom color 1', '7'],
            ['2', 't', '', 'New Color', '8'],
            ['2', 'f', '', '44.4', '1'],
            ['2', 'f', '', '55.5', '2'],
            ['3', 't', '1795', 'One size (plus)', '1'],
            ['3', 't', '102314214578', 'Custom size 1', '2'],
            ['3', 'f', '5561256091', 'Material 1', '1'],
            ['3', 'f', '5561256101', 'Material 2', '2']
        ]

        from data.test_variations_inline_properties_changes_expected_data import expected_api_calls

        self.set_etsy_testcase('listings_push_inventory')

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # --- Add variations to 1st listing ---

        # Choose 1st and 2nd property and their options
        row1 = bpiv.listing_row('Product #1 without variations')
        bpiv.set_property(row1, 0, 'Color (primary)')
        bpiv.add_all_options(row1, 0)
        bpiv.set_property(row1, 1, 'Color (secondary)')
        bpiv.add_option(row1, 1, 'Blue')
        bpiv.add_custom_option(row1, 1, 'Levande')

        # Set individual prices on the second property
        bpiv.select_inventory_tab(row1, 'Price')
        click(bpiv.bulk_header_checkbox(row1, 1), delay=0.5)

        new_prices1 = ['33.33', '333.33']
        for i, price in enumerate(new_prices1):
            price_input = bpiv.bulk_individual_option_inputs(row1, 1)[i]
            price_input.clear()
            send_keys(price_input, price)

        # Set global Quantity
        bpiv.select_inventory_tab(row1, 'Quantity')
        global_input = bpiv.global_quantity_input(row1)
        global_input.clear()
        send_keys(global_input, '33')

        # --- Change variations on 2nd listing - add property, replace options ---

        # Modify options on the first property
        row2 = bpiv.listing_row('Product #2 with one variation with pricing')
        bpiv.delete_option(row2, 0, option_index=7)
        bpiv.add_custom_option(row2, 0, 'New Color')

        # Choose second property
        bpiv.set_property(row2, 1, 'Dimensions', 'Inches')
        bpiv.add_custom_option(row2, 1, '44.4')
        bpiv.add_custom_option(row2, 1, '55.5')

        # Set price for new option on the first property
        bpiv.select_inventory_tab(row2, 'Price')
        price_input = bpiv.bulk_individual_option_inputs(row2, 0)[7]
        send_keys(price_input, '11.11')

        # Set individual quantities on the second property
        bpiv.select_inventory_tab(row2, 'Quantity')
        click(bpiv.bulk_header_checkbox(row2, 1), delay=0.5)

        new_quantities2 = ['111', '222']
        for i, price in enumerate(new_quantities2):
            quantity_input = bpiv.bulk_individual_option_inputs(row2, 1)[i]
            quantity_input.clear()
            send_keys(quantity_input, price)

        # --- Change variations on 3rd listing - delete options ---

        # Delete one option from each property
        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        bpiv.delete_option(row3, 0, option_index=0)
        bpiv.delete_option(row3, 1, option_index=2)

        bpiv.end_inline_edit()

        # --- Check selection of listings, sync button/dot and sync updates ---

        # Check that edited listings are unchecked
        check_listings_checked(bpiv, [False, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)
        check_etsy_emulator_requests(expected_api_calls)

    def test_variations_inline_price_change(self):
        """ Tests price changes on two listings including where the price is set using variations inline edit
        """

        expected_variation_properties = [
            ['2', 't', '200', 'Primary color', '', 't', 'f', 'f'],
            ['3', 't', '52047899294', 'Size', '25', 'f', 't', 'f'],
            ['3', 'f', '507', 'Material', '', 'f', 't', 'f']
        ]

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '99.50', '111', '11', 't', 'Beige', '1', '', ''],
            ['2', '2.00', '111', '11', 't', 'Black', '2', '', ''],
            ['2', '3.00', '111', '11', 'f', 'Blue', '3', '', ''],
            ['2', '4.00', '111', '11', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', '111', '11', 't', 'White', '5', '', ''],
            ['2', '6.00', '111', '11', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', '111', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', '111', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '101.00', '222', '1', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '101.00', '222', '2', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '101.00', '222', '3', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '101.00', '222', '4', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '101.00', '222', '5', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '101.00', '222', '6', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '101.00', '222', '7', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '101.00', '222', '8', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '101.00', '222', '9', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        from data.test_variations_inline_price_change_expected_data import expected_api_calls

        self.set_etsy_testcase('listings_push_inventory')

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # --- Change one individual price in 2nd listing ---
        row2 = bpiv.listing_row('Product #2 with one variation with pricing')

        bpiv.select_inventory_tab(row2, 'Price')
        first_input = bpiv.bulk_individual_option_inputs(row2, 0)[0]
        first_input.clear()
        send_keys(first_input, '99.50')

        # --- Change price to global and set value in 3rd listing ---
        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        bpiv.select_inventory_tab(row3, 'Price')
        # Switch to global price
        click(bpiv.bulk_header_checkbox(row3, 0), delay=0.5)

        global_input = bpiv.global_price_input(row3)
        global_input.clear()
        send_keys(global_input, '101')

        bpiv.end_inline_edit()

        # --- Check selection of listings, sync button/dot and sync updates ---

        # Check that edited listings are unchecked
        check_listings_checked(bpiv, [True, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, expected_variation_properties, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

    def test_variations_inline_quantity_change(self):
        """ Tests quantity changes on two listings including where the quantity is set using variations inline edit
        """

        new_quantities2 = ['1', '2', '0']
        new_quantities3 = ['100', '200', '0']

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', '111', '1', 't', 'Beige', '1', '', ''],
            ['2', '2.00', '111', '2', 't', 'Black', '2', '', ''],
            ['2', '3.00', '111', '0', 'f', 'Blue', '3', '', ''],
            ['2', '4.00', '111', '11', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', '111', '11', 't', 'White', '5', '', ''],
            ['2', '6.00', '111', '11', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', '111', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', '111', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '10.00', '222', '100', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '10.00', '222', '200', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '10.00', '222', '0', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '10.00', '222', '100', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '10.00', '222', '200', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '10.00', '222', '0', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '10.00', '222', '100', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '10.00', '222', '200', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '10.00', '222', '0', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        expected_variation_properties = [
            ['2', 't', '200', 'Primary color', '', 't', 't', 'f'],
            ['3', 't', '52047899294', 'Size', '25', 'f', 'f', 'f'],
            ['3', 'f', '507', 'Material', '', 'f', 't', 'f']
        ]

        from data.test_variations_inline_quantity_change_expected_data import expected_api_calls

        self.set_etsy_testcase('listings_push_inventory')

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # --- Change a few individual quantities in 2nd listing ---
        row2 = bpiv.listing_row('Product #2 with one variation with pricing')

        bpiv.select_inventory_tab(row2, 'Quantity')
        # Switch to individual quantity on the first property
        click(bpiv.bulk_header_checkbox(row2, 0), delay=0.5)

        # Change a few quantities, remaining are inherited from original global value
        for i, quantity in enumerate(new_quantities2):
            qty_input = bpiv.bulk_individual_option_inputs(row2, 0)[i]
            qty_input.clear()
            send_keys(qty_input, quantity)

        # --- Change quantity to individual and set values in 3rd listing ---

        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        # First switch price to global
        bpiv.select_inventory_tab(row3, 'Price')
        click(bpiv.bulk_header_checkbox(row3, 0), delay=0.5)

        bpiv.select_inventory_tab(row3, 'Quantity')
        # Switch to quantity on the second property
        click(bpiv.bulk_header_checkbox(row3, 0), delay=0.5)

        # Set quantities
        for i, quantity in enumerate(new_quantities3):
            qty_input = bpiv.bulk_individual_option_inputs(row3, 1)[i]
            send_keys(qty_input, quantity)

        bpiv.end_inline_edit()

        # --- Check selection of listings, sync button/dot and sync updates ---

        # Check that edited listings are unchecked
        check_listings_checked(bpiv, [True, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, expected_variation_properties, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

    def test_variations_inline_sku_change(self):
        """ Tests SKU changes on two listings including where the SKU is set using variations inline edit
        """

        new_sku2 = 'SKU002'
        new_skus3 = ['SKU003A', 'SKU003B', 'SKU003C']

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', 'SKU002', '11', 't', 'Beige', '1', '', ''],
            ['2', '2.00', 'SKU002', '11', 't', 'Black', '2', '', ''],
            ['2', '3.00', 'SKU002', '11', 'f', 'Blue', '3', '', ''],
            ['2', '4.00', 'SKU002', '11', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', 'SKU002', '11', 't', 'White', '5', '', ''],
            ['2', '6.00', 'SKU002', '11', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', 'SKU002', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', 'SKU002', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '10.00', 'SKU003A', '1', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '20.00', 'SKU003B', '2', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '30.00', 'SKU003C', '3', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '40.00', '222', '4', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '50.00', '222', '5', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '60.00', '222', '6', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '70.00', '222', '7', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '80.00', '222', '8', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '90.00', '222', '9', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        expected_variation_properties = [
            ['2', 't', '200', 'Primary color', '', 't', 'f', 'f'],
            ['3', 't', '52047899294', 'Size', '25', 't', 't', 't'],
            ['3', 'f', '507', 'Material', '', 't', 't', 't']
        ]

        from data.test_variations_inline_sku_change_expected_data import expected_api_calls

        self.set_etsy_testcase('listings_push_inventory')

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # --- Change global sku in 2nd listing ---

        row2 = bpiv.listing_row('Product #2 with one variation with pricing')
        bpiv.select_inventory_tab(row2, 'SKU')

        # Clear global input and set to new value
        global_input = bpiv.global_sku_input(row2)
        global_input.clear()
        send_keys(global_input, new_sku2)

        # --- Change skus to combinations and set values in 3rd listing ---

        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        bpiv.select_inventory_tab(row3, 'SKU')
        # Clear global input and switch to sku on combinations
        global_input = bpiv.global_sku_input(row3)
        global_input.clear()
        click(bpiv.bulk_header_checkbox(row3, 0), delay=0.5)

        # Set skus
        for i, sku in enumerate(new_skus3):
            sku_input = bpiv.bulk_individual_option_inputs(row3, 0)[i]
            sku_input.clear()
            send_keys(sku_input, sku)

        bpiv.end_inline_edit()

        # --- Check selection of listings, sync button/dot and sync updates ---

        # Check that edited listings are unchecked
        check_listings_checked(bpiv, [True, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, expected_variation_properties, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

    def test_variations_inline_visibility_change(self):
        """ Tests visibilities changes on two listings using variations inline edit
        """

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', '111', '11', 't', 'Beige', '1', '', ''],
            ['2', '2.00', '111', '11', 'f', 'Black', '2', '', ''],
            ['2', '3.00', '111', '11', 't', 'Blue', '3', '', ''],
            ['2', '4.00', '111', '11', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', '111', '11', 't', 'White', '5', '', ''],
            ['2', '6.00', '111', '11', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', '111', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', '111', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '10.00', '222', '1', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '20.00', '222', '2', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '30.00', '222', '3', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '40.00', '222', '4', 'f', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '50.00', '222', '5', 't', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '60.00', '222', '6', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '70.00', '222', '7', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '80.00', '222', '8', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '90.00', '222', '9', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        from data.test_variations_inline_visibility_change_expected_data import expected_api_calls

        self.set_etsy_testcase('listings_push_inventory')

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # --- Change visibilities in 2nd listing ---

        row2 = bpiv.listing_row('Product #2 with one variation with pricing')
        bpiv.select_inventory_tab(row2, 'Visibility')

        # Click second and third toggle
        toggles = bpiv.bulk_individual_option_toggles(row2, i=0)
        click(toggles[1])
        click(toggles[2])

        # --- Change visibilities in 3rd listing ---

        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        bpiv.select_inventory_tab(row3, 'Visibility')

        # Click fourth and fifth toggle
        toggles = bpiv.bulk_individual_option_toggles(row3, i=0)
        click(toggles[3])
        click(toggles[4])

        bpiv.end_inline_edit()

        # --- Check selection of listings, sync button/dot and then sync updates ---

        # Check that edited listings are unchecked
        check_listings_checked(bpiv, [True, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # --- Check state of data in DB and requests to Etsy emulator

        check_db_state(expected_product_offerings, DB_INITIAL_VARIATION_PROPERTIES, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

    def test_variations_inline_delete_single_property(self):
        """ Test deletion of a variation property on a listing using inline edit
        """

        self.set_etsy_testcase('listings_51')

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', '111', '11', 't', '', '', '', ''],
            ['3', '10.50', '222', '7', 't', 'XXS', '1', '', ''],
            ['3', '42.00', '222', '21', 't', 'One size (plus)', '2', '', ''],
            ['3', '201.00', '222', '132', 't', 'Custom size 1', '3', '', '']
        ]

        expected_variation_properties = [
            ['3', 't', '52047899294', 'Size', '25', 't', 't', 'f']
        ]

        expected_variation_options = [
            ['3', 't', '1672', 'XXS', '1'],
            ['3', 't', '1795', 'One size (plus)', '2'],
            ['3', 't', '102314214578', 'Custom size 1', '3']
        ]

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Delete first variation property in second listing
        row2 = bpiv.listing_row('Product #2 with one variation with pricing')
        bpiv.delete_property(row2, 0)

        # Delete second variation property in third listing
        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        bpiv.delete_property(row3, 1)

        # Check that Price and Quantity tabs are now marked invalid
        assert bpiv.inventory_tabs_errors(row3) == [False, True, True, False, False]

        # Set new individual prices on the first property
        bpiv.select_inventory_tab(row3, 'Price')

        new_prices3 = ['10.50', '42', '201']
        for i, price in enumerate(new_prices3):
            price_input = bpiv.bulk_individual_option_inputs(row3, 0)[i]
            price_input.clear()
            send_keys(price_input, price)

        # Set new quantities
        bpiv.select_inventory_tab(row3, 'Quantity')

        new_quantities3 = ['7', '21', '132']
        for i, quantity in enumerate(new_quantities3):
            qty_input = bpiv.bulk_individual_option_inputs(row3, 0)[i]
            send_keys(qty_input, quantity)

        bpiv.end_inline_edit()

        # Check that edited listings are unchecked
        check_listings_checked(bpiv, [True, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # Check state of data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)

    def test_variations_inline_delete_both_properties(self):
        """ Test deletion of both variation properties on a listing using inline edit
        """

        self.set_etsy_testcase('listings_51')

        expected_product_offerings = [
            ['1', '500.00', '550', '50', 't', '', '', '', ''],
            ['2', '1.00', '111', '11', 't', '', '', '', ''],
            ['3', '10.00', '222', '40', 't', '', '', '', '']
        ]

        expected_variation_properties = []

        expected_variation_options = []

        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Delete also first variation property in second listing - for the simplicity of the test
        row2 = bpiv.listing_row('Product #2 with one variation with pricing')
        bpiv.delete_property(row2, 0)

        # Delete both variation properties in third listing
        row3 = bpiv.listing_row('Product #3 with two variations with quantity on both and pricing on both')
        bpiv.delete_property(row3, 0)
        bpiv.delete_property(row3, 0)

        # Check that edited listing is unchecked
        check_listings_checked(bpiv, [True, False, False])

        # Check that sync is ready and sync
        check_sync_button_and_dot(bpiv, expected_sync_ready=True)
        click(bpiv.sync_updates_button())
        check_sync_button_and_dot(bpiv, expected_sync_ready=False)

        # Check state of data in DB
        check_db_state(expected_product_offerings, expected_variation_properties, expected_variation_options)
