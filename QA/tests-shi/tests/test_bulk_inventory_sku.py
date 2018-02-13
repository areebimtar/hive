# /usr/bin/env python

import pytest
from fixtures.fixtures import login, rabbit_init, reload, select_listings_to_edit, test_id
from flaky import flaky
from tests.base import BaseTestClass
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from tests.variations import check_etsy_emulator_requests, check_db_state, DB_INITIAL_VARIATION_PROPERTIES, \
    DB_INITIAL_VARIATION_OPTIONS
from pages.bulk_page_inventory_sku import BulkPageInventorySku

expected_listings_01 = [
            'Product #1 without variations\n550',
            'Product #2 with one variation with pricing\n111',
            'Product #3 with two variations with quantity on both and pricing on both\n222'
        ]

@pytest.mark.usefixtures("test_status", "test_id", "rabbit_init", "reload", "login", "select_listings_to_edit")
@flaky
class TestBulkInventorySku(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.sql_file = 'listings_13'    # will be loaded by 'reload' fixture
        self.listings_to_select = 'ALL'  # used by select_listings_to_edit fixture
        self.listing_status = 'Active'    # used by select_listings_to_edit fixture
        self.bulk_tab = 'SKU'     # used by select_listings_to_edit fixture

    ### Tests ###

    # -----------------------------------------------   ---------------------------------
    def test_inventory_sku_add_before_after(self):
        """ Tests that a price can be set in bulk edit inventory
        """

        expected_listings_02 = [
            'Product #1 without variations\nIT550',
            'Product #2 with one variation with pricing\nIT111',
            'Product #3 with two variations with quantity on both and pricing on both\nIT222'
        ]
        expected_listings_03 = [
            'Product #1 without variations\nIT550EE',
            'Product #2 with one variation with pricing\nIT111EE',
            'Product #3 with two variations with quantity on both and pricing on both\nIT222EE'
        ]
        expected_listings_04 = [
            'Product #1 without variations\nJEJ',
            'Product #2 with one variation with pricing\nJU2',
            'Product #3 with two variations with quantity on both and pricing on both\nIT222EE33'
        ]
        operation = 'Add Before'
        bis = BulkPageInventorySku(self.driver, self.ts)
        assert bis.sku_input_placeholder() == 'SKU'
        bis.select_operation(operation)

        assert expected_listings_01 == bis.listing_rows_texts_sorted()

        assert bis.is_part_modified('SKU') is False, 'Blue dot should not be visible yet'
        assert bis.sync_updates_button().is_enabled() is False, 'Sync button should be still disabled'

        send_keys(bis.sku_input(), 'IT')

        # Apply changes
        click(bis.operation_apply())
        assert expected_listings_02 == bis.listing_rows_texts_sorted()

        assert bis.is_part_modified('SKU') is True, 'Blue dot should be visible yet'
        assert bis.sync_updates_button().is_enabled() is True, 'Sync button should be enabled'

        assert bis.operation_apply().is_enabled() is False, 'Apply button is enabled'

        operation = 'Add After'
        bis.select_operation(operation)
        assert bis.is_part_modified('SKU') is True, 'Blue dot should be visible'
        assert bis.sync_updates_button().is_enabled() is True, 'Sync button should be  enabled'

        send_keys(bis.sku_input(), 'EE')

        # Apply changes
        click(bis.operation_apply())
        assert expected_listings_03 == bis.listing_rows_texts_sorted()

        assert bis.is_part_modified('SKU') is True, 'Blue dot should be visible'
        assert bis.sync_updates_button().is_enabled() is True, 'Sync button should be  enabled'

        assert bis.operation_apply().is_enabled() is False, 'Apply button is enabled'

        #individual changes
        bis.change_individual_sku('Product #1 without variations', 'JEJ')
        bis.change_individual_sku('Product #2 with one variation with pricing', 'JU2')
        bis.select_operation(operation)
        send_keys(bis.sku_input(), '33')

        click(bis.operation_apply(), delay=2)
        assert expected_listings_04 == bis.listing_rows_texts_sorted()
        assert bis.is_part_modified('SKU') is True, 'Blue dot should be visible'
        assert bis.sync_updates_button().is_enabled() is True, 'Sync button should be enabled'

        assert bis.operation_apply().is_enabled() is False, 'Apply button is enabled'

    def test_inventory_sku_delete_and_replace(self):

        self.set_etsy_testcase('listings_push_inventory')

        expected_listings_02 = [
            'Product #1 without variations\n0022550',
            'Product #2 with one variation with pricing\n0022111',
            'Product #3 with two variations with quantity on both and pricing on both\n0022222'
        ]

        expected_listings_03 = [
            'Product #1 without variations\n00550',
            'Product #2 with one variation with pricing\n00111',
            'Product #3 with two variations with quantity on both and pricing on both\n002'
        ]
        expected_listings_04 = [
            'Product #1 without variations\nLOLO55LO',
            'Product #2 with one variation with pricing\nLOLO111',
            'Product #3 with two variations with quantity on both and pricing on both\nLOLO2'
        ]

        # expected at the end of the test
        expected_product_offerings = [
            ['1', '500.00', 'LOLO55LO', '50', 't', '', '', '', ''],
            ['2', '1.00', 'LOLO111', '11', 't', 'Beige', '1', '', ''],
            ['2', '2.00', 'LOLO111', '11', 't', 'Black', '2', '', ''],
            ['2', '3.00', 'LOLO111', '11', 'f', 'Blue', '3', '', ''],
            ['2', '4.00', 'LOLO111', '11', 'f', 'Silver', '4', '', ''],
            ['2', '5.00', 'LOLO111', '11', 't', 'White', '5', '', ''],
            ['2', '6.00', 'LOLO111', '11', 't', 'Yellow', '6', '', ''],
            ['2', '7.00', 'LOLO111', '11', 't', 'Custom color 1', '7', '', ''],
            ['2', '8.00', 'LOLO111', '11', 't', 'Custom color 2', '8', '', ''],
            ['3', '10.00', 'LOLO2', '1', 't', 'XXS', '1', 'Material 1', '1'],
            ['3', '20.00', 'LOLO2', '2', 't', 'XXS', '1', 'Material 2', '2'],
            ['3', '30.00', 'LOLO2', '3', 't', 'XXS', '1', 'Material 3', '3'],
            ['3', '40.00', 'LOLO2', '4', 't', 'One size (plus)', '2', 'Material 1', '1'],
            ['3', '50.00', 'LOLO2', '5', 'f', 'One size (plus)', '2', 'Material 2', '2'],
            ['3', '60.00', 'LOLO2', '6', 't', 'One size (plus)', '2', 'Material 3', '3'],
            ['3', '70.00', 'LOLO2', '7', 't', 'Custom size 1', '3', 'Material 1', '1'],
            ['3', '80.00', 'LOLO2', '8', 't', 'Custom size 1', '3', 'Material 2', '2'],
            ['3', '90.00', 'LOLO2', '9', 't', 'Custom size 1', '3', 'Material 3', '3']
        ]

        from data.test_inventory_sku_delete_and_replace_expected_data import expected_api_calls

        operation = 'Delete'
        bis = BulkPageInventorySku(self.driver, self.ts)
        assert expected_listings_01 == bis.listing_rows_texts_sorted()

        # this is shortcut how to add 0022 before every listings sku. Controls of corrections are in another Test
        send_keys(bis.sku_input(), '0022')
        click(bis.operation_apply())
        assert expected_listings_02 == bis.listing_rows_texts_sorted()

        # work with new data
        bis.select_operation(operation)
        send_keys(bis.sku_input(), '22')

        # Apply changes
        click(bis.operation_apply())
        assert expected_listings_03 == bis.listing_rows_texts_sorted()

        assert bis.is_part_modified('SKU') is True, 'Blue dot should be visible yet'
        assert bis.sync_updates_button().is_enabled() is True, 'Sync button should be enabled'

        assert bis.operation_apply().is_enabled() is False, 'Apply button is enabled'

        operation = 'Find & Replace'
        bis.select_operation(operation)

        bis.find_n_replace('0', 'LO')

        # Apply changes
        click(bis.operation_apply())
        assert expected_listings_04 == bis.listing_rows_texts_sorted()

        assert bis.is_part_modified('SKU') is True, 'Blue dot should be visible yet'
        assert bis.sync_updates_button().is_enabled() is True, 'Sync button should be enabled'

        assert bis.operation_apply().is_enabled() is False, 'Apply button is enabled'

        # Sync changes
        click(bis.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bis.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bis.is_part_modified('SKU') is False, 'Blue dot is still shown'

        # --- Check state of data in DB and requests to Etsy emulator
        check_db_state(expected_product_offerings, DB_INITIAL_VARIATION_PROPERTIES, DB_INITIAL_VARIATION_OPTIONS)
        check_etsy_emulator_requests(expected_api_calls)

    def test_inventory_sku_change_to(self):
        """ Tests Change to operation for SKU editor

        :return:
        """
        expected_listings = [
            'Product #1 without variations\n550',
            'Product #2 with one variation with pricing\nCHANGE',
            'Product #3 with two variations with quantity on both and pricing on both\nCHANGE'
        ]

        # Change SKUs on 2nd and 3rd listing
        operation = 'Change To'
        bis = BulkPageInventorySku(self.driver, self.ts)
        bis.select_operation(operation)

        # unselect 1st
        bis.click_on_listings(['Product #1 without variations'])

        # enter new SKU
        send_keys(bis.sku_input(), 'CHANGE')

        # Apply and check results
        click(bis.operation_apply())
        wait_for_web_assert(False, bis.operation_apply().is_enabled, 'Apply button is not disabled')
        assert bis.listing_rows_texts_sorted() == expected_listings

    def test_inventory_sku_invalid_bulk(self):
        """ Tests that a invalid sku cannot be entered
        """
        bis = BulkPageInventorySku(self.driver, self.ts)

        # set incorrect SKU
        input_field = bis.operation_input()
        send_keys(input_field, 'x' * 33)

        # check that error is displayed for bulk edit
        err = bis.error_baloon()
        assert err == 'SKU can have at most 32 characters'

        # check that error is displayed on listing #1
        row = bis.listing_row('Product #1 without variations')
        assert bis.error_baloon_texts(row) == ['SKU can have at most 32 characters']

        assert bis.operation_apply().is_enabled() is False, 'Apply button is not disabled'

    def test_inventory_sku_invalid_inline(self):
        """ Tests that error message is shown when invalid sku is entered using inline edit
        """

        bis = BulkPageInventorySku(self.driver, self.ts)

        # Set sku of a listing to too long value using inline edit
        row = bis.listing_row('Product #1 without variations')
        bis.set_individual_sku(row, 'x' * 33, enter=False)

        # Check that error message is shown on listing
        assert bis.error_baloon_texts(row) == ['SKU can have at most 32 characters']

        # Verify that invalid sku is not applied - original price should be preserved
        bis.set_individual_sku(row, '^')
        assert bis.product_sku_text(row) == '550'
