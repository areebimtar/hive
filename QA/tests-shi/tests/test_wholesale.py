import pytest
from tests.base import BaseTestClass, run_sql, HIVE_DATABASE_URL
from modules.selenium_tools import send_keys, click, wait_for_web_assert
from modules.rabbit import setup_rabbit
from pages.login_page import LoginPage
from pages.main_page import MainPage
from pages.bulk_page import BulkPage
from pages.bulk_page_inventory_variations import BulkPageInventoryVariations
import tests.vela_control as vela
from tests.variations import check_etsy_emulator_requests
from modules.hivedb import HiveDatabase
from fixtures.fixtures import test_id
from flaky import flaky

CANNOT_EDIT_INVENTORY_TEXT = 'Cannot edit inventory for "Retail & Wholesale" listings'
CANNOT_EDIT_OCCASION_TEXT = 'Cannot edit occasion for "Retail & Wholesale" listings'
CANNOT_EDIT_HOLIDAY_TEXT = 'Cannot edit holiday for "Retail & Wholesale" listings'
VARIATIONS_NO_PREVIEW_TEXT = 'Bulk edits will replace existing categories and variations'


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestWholesaleImport(BaseTestClass):

    # --- Tests ---

    def test_wholesale_import(self):
        """ Test verifies import and UI appearance of listings that have different value of the flag
            'can_write_inventory' - Etsy returns false for this flag when a listing is not Retail listing. So far it is
            not possible to update inventory and attributes on such listings through API,
            therefore VELA doesn't allow to change it.
        """

        expected_wholesale_inventory_listing_text = 'Two\n' + CANNOT_EDIT_INVENTORY_TEXT
        expected_wholesale_attributes_listing_text = {
            'Occasion': 'Two\n' + CANNOT_EDIT_OCCASION_TEXT,
            'Holiday': 'Two\n' + CANNOT_EDIT_HOLIDAY_TEXT,
        }

        expected_retail_listing_texts = {
            'Price': 'One\n$10.00',
            'Quantity': 'One\n1',
            'SKU': 'One',
            'Occasion': 'One\nAnniversary',
            'Holiday': 'One\nChoose Holiday'
        }

        self.set_etsy_testcase('listings_15')
        self.stop_all()
        run_sql('HIVE', 'listings_no_shop', retry=2)
        self.restart_all()

        # Import shop with two listings
        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)
        lp.go_to_etsy()

        vela.wait_for_shop_to_sync(expected_status='up_to_date')

        # Select both listings and go to bulk page
        mp = MainPage(self.driver)
        mp.get_main(self.base_url)
        mp.select_filter_tab('Active')

        mp.select_listings_to_edit(checked_listings='ALL')

        # In Variations editor, check error message on the non-retail listing
        bp = BulkPage(self.driver)
        click(bp.edit_part('Variations'))
        assert 'Choose Property' in bp.listing_row('One').text
        assert bp.listing_row('Two').text == expected_wholesale_inventory_listing_text

        # In remaining Inventory editors, check error message on the non-retail listing
        for editor_name in ['Price', 'Quantity', 'SKU']:
            click(bp.edit_part(editor_name))
            assert bp.listing_row('One').text == expected_retail_listing_texts[editor_name]
            assert bp.listing_row('Two').text == expected_wholesale_inventory_listing_text

        # In Holiday, Occasion editors, check error message on the non-retail listing
        for editor_name in ['Occasion', 'Holiday']:
            click(bp.edit_part(editor_name))
            assert bp.listing_row('One').text == expected_retail_listing_texts[editor_name]
            assert bp.listing_row('Two').text == expected_wholesale_attributes_listing_text[editor_name]


@pytest.mark.usefixtures("test_status", "test_id")
@flaky
class TestWholesaleSync(BaseTestClass):

    def setup_method(self, method):
        super().setup_method(method)
        setup_rabbit()
        self.set_etsy_testcase('listings_16')
        self.stop_all()
        run_sql('HIVE', 'listings_16_changed', retry=2)
        run_sql('HIVE', 'update_shops_timestamp', retry=2)
        self.restart_all()

        self.db = HiveDatabase(HIVE_DATABASE_URL)

        lp = LoginPage(self.driver)
        lp.login(page=self.login_url_http)

        # Select both listings and go to bulk editor
        mp = MainPage(self.driver)
        mp.get_main(self.base_url)
        mp.select_filter_tab('Active')

        mp.select_listings_to_edit(checked_listings='ALL')

    def test_wholesale_bulk_change_inventory(self):
        """ Test verifies bulk changes of inventory of listings that have different value of the flag
            'can_write_inventory' - Etsy returns false for this flag when a listing is not Retail listing. So far it is
            not possible to update inventory and attributes on such listings through API, therefore VELA doesn't allow
            to change it.
            Test also verifies that if 'can_write_inventory' is changed to false on Etsy, no inventory updates of the
            listing are sent to Etsy (HIVE-1553).
        """

        api_products_unpacked1 = [{
            'offerings': [{
                'is_enabled': 1,
                'price': 33.33,
                'quantity': 21
            }],
            'property_values': [{
                'property_id': 500,
                'property_name': 'Finish',
                'scale_id': None,
                'value': 'smooth',
                'value_id': None
            }],
            'sku': 'NEW SKU'
        }]

        expected_api_calls = [{
            'PUT': '/v2/listings/100001/inventory?price_on_property=&quantity_on_property=&sku_on_property=',
            'body': {
                '_products_unpacked': api_products_unpacked1,
                'listing_id': 100001
            }
        }]

        expected_can_write_inventory = [
            ('100001', True),
            ('100002', False),
            ('100003', False),
        ]

        bp = BulkPage(self.driver)

        # ---- Make changes in Variations editor ----

        click(bp.edit_part('Variations'))

        category = ['Accessories']
        bpiv = BulkPageInventoryVariations(self.driver, self.ts)

        # Select category in bulk edit area
        bpiv.select_category(category)

        # Set first variation property and its option
        bulk_row = bpiv.bulk_edit_row
        bpiv.set_property(bulk_row, 0, 'Finish')
        bpiv.add_custom_option(bulk_row, 0, 'smooth')

        # Apply changes and check results in UI
        click(bpiv.operation_apply())
        assert 'smooth' in bpiv.listing_row('One').text
        assert bpiv.listing_row('Two').text == 'Two\n' + CANNOT_EDIT_INVENTORY_TEXT
        assert 'smooth' in bpiv.listing_row('Three').text
        wait_for_web_assert(True, lambda: bpiv.is_part_modified('Variations'),
                            'Blue dot didn\'t show up for Variations editor')

        # ---- Make changes in Price, Quantity, SKU editors ----

        retail_values = {
            'Price': '33.33',
            'Quantity': '21',
            'SKU': 'NEW SKU'
        }

        retail_expected_values = {
            'Price': '$33.33',
            'Quantity': '21',
            'SKU': 'NEW SKU'
        }

        for editor_name in ['Price', 'Quantity', 'SKU']:
            # Switch to particular inventory editor, choose bulk operation and set the value for it
            click(bpiv.edit_part(editor_name))
            operation = 'Change To'
            bp.select_operation(operation)
            input_field = bp.operation_input()
            send_keys(input_field, retail_values[editor_name])

            # Apply changes and check results in UI
            click(bp.operation_apply())
            wait_for_web_assert(True, lambda: bp.is_part_modified(editor_name),
                                'Blue dot didn\'t show up for %s editor' % editor_name)
            assert bp.listing_row('One').text == 'One\n' + retail_expected_values[editor_name]
            assert bp.listing_row('Two').text == 'Two\n' + CANNOT_EDIT_INVENTORY_TEXT
            assert bp.listing_row('Three').text == 'Three\n' + retail_expected_values[editor_name]

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - only first listing should be updated
        check_etsy_emulator_requests(expected_api_calls)

        # Check can_write_inventory flags in DB - it was set to False on the listing 'Three'
        assert self.db.get_can_write_inventory() == expected_can_write_inventory

    def test_wholesale_bulk_change_occasion(self):
        """ Test verifies bulk changes of occasion of listings that have different value of the flag
            'can_write_inventory' - Etsy returns false for this flag when a listing is not Retail listing. So far it is
            not possible to update inventory and attributes on such listings through API, therefore VELA doesn't allow
            to change it.
            Test also verifies that if 'can_write_inventory' is changed to false on Etsy, no occasion
            updates of the listing are sent to Etsy (HIVE-1553).
        """

        expected_can_write_inventory = [
            ('100001', True),
            ('100002', False),
            ('100003', False),
        ]

        retail_expected_value = 'Prom'

        expected_api_calls = [
            {
                'PUT': '/v2/listings/100001/attributes/46803063641?value_ids=29',
                'body': {}
            }
        ]

        # ---- Make changes in Occasion editor ----

        bp = BulkPage(self.driver)
        click(bp.edit_part('Occasion'))
        bp.select_occasion('Prom')

        # Apply changes and check listings
        click(bp.operation_apply())

        assert bp.listing_row('One').text == 'One\n' + retail_expected_value
        assert bp.listing_row('Two').text == 'Two\n' + CANNOT_EDIT_OCCASION_TEXT
        assert bp.listing_row('Three').text == 'Three\n' + retail_expected_value

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - only first listing should be updated
        check_etsy_emulator_requests(expected_api_calls)

        # Check can_write_inventory flags in DB - it was set to False on the listing 'Three'
        assert self.db.get_can_write_inventory() == expected_can_write_inventory

    def test_wholesale_bulk_delete_occasion(self):
        """ Test verifies bulk delete of occasion of listings that have different value of the flag
            'can_write_inventory' - Etsy returns false for this flag when a listing is not Retail listing. So far it is
            not possible to update inventory and attributes on such listings through API, therefore VELA doesn't allow
            to change it.
            Test also verifies that if 'can_write_inventory' is changed to false on Etsy, no occasion
            updates of the listing are sent to Etsy (HIVE-1553).
        """

        expected_can_write_inventory = [
            ('100001', True),
            ('100002', False),
            ('100003', False),
        ]

        retail_expected_value = 'Choose Occasion'

        expected_api_calls = [
            {
                'DELETE': '/v2/listings/100001/attributes/46803063641',
                'body': {}
            }
        ]

        # ---- Make changes in Occasion editor ----

        bp = BulkPage(self.driver)
        click(bp.edit_part('Occasion'))
        bp.select_occasion('None')

        # Apply changes and check listings
        click(bp.operation_apply())

        assert bp.listing_row('One').text == 'One\n' + retail_expected_value
        assert bp.listing_row('Two').text == 'Two\n' + CANNOT_EDIT_OCCASION_TEXT
        assert bp.listing_row('Three').text == 'Three\n' + retail_expected_value

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - only first listing should be updated
        check_etsy_emulator_requests(expected_api_calls)

        # Check can_write_inventory flags in DB - it was set to False on the listing 'Three'
        assert self.db.get_can_write_inventory() == expected_can_write_inventory

    def test_wholesale_bulk_change_holiday(self):
        """ Test verifies bulk changes of holiday of listings that have different value of the flag
            'can_write_inventory' - Etsy returns false for this flag when a listing is not Retail listing. So far it is
            not possible to update inventory and attributes on such listings through API, therefore VELA doesn't allow
            to change it.
            Test also verifies that if 'can_write_inventory' is changed to false on Etsy, no holiday
            updates of the listing are sent to Etsy (HIVE-1553).
        """

        expected_can_write_inventory = [
            ('100001', True),
            ('100002', False),
            ('100003', False),
        ]

        retail_expected_value = 'Halloween'

        expected_api_calls = [
            {
                'PUT': '/v2/listings/100001/attributes/46803063659?value_ids=39',
                'body': {}
            }
        ]

        # ---- Make changes in Holiday editor ----

        bp = BulkPage(self.driver)
        click(bp.edit_part('Holiday'))
        bp.select_holiday('Halloween')

        # Apply changes and check listings
        click(bp.operation_apply())

        assert bp.listing_row('One').text == 'One\n' + retail_expected_value
        assert bp.listing_row('Two').text == 'Two\n' + CANNOT_EDIT_HOLIDAY_TEXT
        assert bp.listing_row('Three').text == 'Three\n' + retail_expected_value

        # Check that sync button is enabled after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')

        # Check API calls to Etsy emulator - only first listing should be updated
        check_etsy_emulator_requests(expected_api_calls)

        # Check can_write_inventory flags in DB - it was set to False on the listing 'Three'
        assert self.db.get_can_write_inventory() == expected_can_write_inventory
