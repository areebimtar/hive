# /usr/bin/env python
import datetime
import os
from time import sleep, strftime

import psycopg2
import pytest
from selenium.webdriver.common.keys import Keys

import tests.vela_control as vela
from modules.etsy_api import EtsyAPI
from modules.hivedb import HiveDatabase
from modules import oauth as oauth
from modules.http import format_http_response
from pages.bulk_page import BulkPage
from pages.bulk_page_inventory_price import BulkPageInventoryPrice
from pages.bulk_page_inventory_quantity import BulkPageInventoryQuantity
from pages.bulk_page_inventory_sku import BulkPageInventorySku
from pages.bulk_page_inventory_variations import BulkPageInventoryVariations
from pages.login_page import LoginPage
from pages.main_page import MainPage
from tests.base import BaseTestClass
from modules.selenium_tools import send_keys
from modules.testing import wait_for_assert
from tests_e2e.modules.logs import Logs, log
from tests_e2e.modules.photos import Photos, compare_images

AT_TITLE = 'auto_test_listing'
AT_DESCRIPTION = 'description'
AT_CATEGORIES = ['Bags & Purses', 'Backpacks']
AT_TAXONOMY_ID = 136
AT_TAXONOMY_PATH_API = ["Bags & Purses", "Backpacks"]
AT_IMAGES = [
    {'file': 'onion.jpg', 'size': '78 x 118'},
    {'file': 'jmeter.png', 'size': '256 x 256'}
]
AT_PRICE = '42'
AT_PRICE_API = '42.00'
AT_QUANTITY = 33
AT_SKU = 'SKU001'
AT_VAR_PROPERTY_ID = 200
AT_VAR_PROPERTY_NAME = 'Color (primary)'
AT_VAR_PROPERTY_NAME_API = 'Primary color'
AT_VAR_OPTION_VALUES = ["Black", "Blue", "Green"]
AT_TAGS = ["test-tag-01", "test-tag-02"]
AT_MATERIALS = ["test material 01", "test material 02"]
AT_SECTION = 'auto-test-section'
AT_RECIPIENT = 'Girls'
AT_OCCASION = 'Birthday'
AT_HOLIDAY = 'Easter'
AT_ATTRIBUTES_API = {('Occasion', AT_OCCASION), ('Holiday', AT_HOLIDAY)}
AT_STYLES = ["Beach", "Fantasy"]

VELA_USER = os.environ['QA_VELA_USER']
VELA_PASSWORD = os.environ['QA_VELA_PASSWORD']
SHOP_SYNC_TIMEOUT = 120

FAKE_SYNC_TIME_STR = '2017-01-01 00:00:00.000+00'
FAKE_SYNC_TIME = datetime.datetime(2017, 1, 1, tzinfo=psycopg2.tz.FixedOffsetTimezone(offset=0, name=None))

# Feature flags for features that are not in production yet
BETA_FEATURE_FLAGS = []


class EtsyApiForATs(EtsyAPI):
    def get_at_listings_details(self):
        listings = {}
        for listing in self.filter_listings(self.get_listings(), AT_TITLE):
            detail = self.get_listing_detail(listing['listing_id'])
            title = detail['title']
            listings[title] = detail
        return listings

    def remove_at_section(self, section_title):
        sections = self.get_sections()
        my_section = [sec for sec in sections if sec['title'] == section_title]
        if len(my_section) > 0:
            session = oauth.get_oauth_session(self.credentials)
            shop_id = self.get_shop_id()
            shop_section_id = my_section[0]['shop_section_id']
            url = oauth.ETSY_API_URL + '/shops/' + shop_id + '/sections/' + str(shop_section_id)
            print('removing section', section_title, shop_section_id)
            response = oauth.delete_protected_resource(session, url)
            assert response.status_code == 200, format_http_response(response)

    def remove_at_listings(self):
        self.remove_listings(AT_TITLE)


@pytest.mark.usefixtures("test_status")
class TestEtsyUpload(BaseTestClass):

    NEW_LISTING = {
        'quantity': 10,
        'title': 'auto_test_listing_01',
        'description': 'description',
        'price': 10,
        'who_made': 'i_did',
        'is_supply': True,
        'when_made': 'made_to_order',
        'state': 'draft'
    }

    def setup_class(self):
        super().setup_class(self)
        self.db = HiveDatabase(os.environ['DATABASE_URL'])
        self.shop_name = os.environ['SHOP_NAME']
        self.shop_id = self.db.get_shop_id(self.shop_name)
        self.user_id = self.db.get_user_id(VELA_USER)
        self.user_db_name = self.db.get_user_db_name(VELA_USER)
        self.company_id = self.db.get_company_id(VELA_USER)

    def get_credentials(self):
        (token, secret) = self.db.get_shop_tokens(self.shop_id)
        return {
            'CLIENT_KEY': os.environ['VELA_CLIENT_TOKEN'],
            'CLIENT_SECRET': os.environ['VELA_CLIENT_SECRET'],
            'AUTHORIZED_OAUTH_TOKEN': token,
            'AUTHORIZED_OAUTH_TOKEN_SECRET': secret,
        }

    def reload_shop(self):
        self.db.set_shop_last_sync_time(self.shop_id, FAKE_SYNC_TIME_STR)
        vela.trigger_etsy_shop_sync(self.company_id, self.shop_id, db_name=self.user_db_name)

        print("Waiting for shop to download ")
        for i in range(SHOP_SYNC_TIMEOUT):
            sleep(1)
            if self.db.get_shop_last_sync_time(self.shop_id) != FAKE_SYNC_TIME:
                break
        assert self.db.get_shop_last_sync_time(self.shop_id) != FAKE_SYNC_TIME, "Shop " + str(self.shop_id) + " is not 'up_to_date'"

    def wait_for_synced(self):
        log("Waiting for changes to be uploaded to Etsy")
        wait_for_assert('up_to_date',
                        lambda: self.db.get_shop_status(self.shop_id),
                        'Shop not synced',
                        retries=SHOP_SYNC_TIMEOUT)
        log("Shop synced")

    def go_to_bulk(self):
        # log in
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_https, user=VELA_USER, password=VELA_PASSWORD)

        # switch the shop if needed
        mp = MainPage(self.driver)
        if mp.shop_name_text() != self.shop_name:
            mp.change_shop(self.shop_name)

        # select listings to edit
        mp.select_listings_to_edit(checked_listings=["auto_test_listing_00", "auto_test_listing_01", "auto_test_listing_02"], status='Draft', filter='auto_')

    def validate_listings(self, listings, timestamp):
        for i, listing in enumerate(listings[key] for key in sorted(listings.keys())):
            id = "{}_{:02d}".format(AT_TITLE, i)
            log("Verifying ", id)

            assert listing['title'] == id + " " + timestamp
            assert listing['description'] == AT_DESCRIPTION + " " + timestamp
            assert listing['taxonomy_id'] == AT_TAXONOMY_ID
            assert listing['taxonomy_path'] == AT_TAXONOMY_PATH_API
            image_urls = [image['url_fullxfull'] for image in listing['Images']]
            compare_images(image_urls, AT_IMAGES)
            assert listing['tags'] == AT_TAGS
            assert listing['materials'] == AT_MATERIALS
            assert listing['Section']['title'] == AT_SECTION

            attributes = set()
            for attribute in listing['Attributes']:
                assert len(attribute['values']) == 1
                attributes.add((attribute['property_name'], attribute['values'][0]))
            assert attributes == AT_ATTRIBUTES_API

            products = listing['Inventory'][0]['products']
            assert len(products) == len(AT_VAR_OPTION_VALUES)
            for j, option_name in enumerate(AT_VAR_OPTION_VALUES):
                assert products[j]['property_values'][0]['property_name'] == AT_VAR_PROPERTY_NAME_API
                assert products[j]['property_values'][0]['property_id'] == AT_VAR_PROPERTY_ID
                assert products[j]['property_values'][0]['values'][0] == AT_VAR_OPTION_VALUES[j]
                assert products[j]['offerings'][0]['price']['currency_formatted_raw'] == AT_PRICE_API
                assert products[j]['offerings'][0]['quantity'] == AT_QUANTITY
                assert products[j]['sku'] == AT_SKU

    def test_etsy_upload(self):
        """
        Verify that listings can be fetched from Etsy, changed in vela GUI and pushed back to Etsy
        """

        # debug
        # with open('tests-etsy/data.json') as f:
        #     data = json.load(f)
        # self.validate_listings(data, '20161124_184056')
        # return

        # Delete log files
        logs = Logs(os.environ['LOG_CLEAN_SCRIPT'], os.environ['LOG_GREP_SCRIPT'])
        logs.empty()

        timestamp = strftime("%Y%m%d_%H%M%S")

        credentials = self.get_credentials()
        etsy = EtsyApiForATs(credentials)

        # Delete our section from Etsy
        log("Deleting section from Etsy")
        etsy.remove_at_section(AT_SECTION)

        # Delete and re-create listings on Etsy
        log("Removing AT listings from Etsy")
        etsy.remove_at_listings()
        log("Creating AT listings on Etsy")
        st_id = etsy.get_shipping_template_id()
        for i in range(3):
            title = "{}_{:02d}".format(AT_TITLE, i)
            etsy.create_listing(dict(self.NEW_LISTING,
                                     title=title,
                                     taxonomy_id=1,
                                     shipping_template_id=st_id))

        listings = etsy.get_listings()
        for listing_id, title in ((l['listing_id'], l['title']) for l in listings if l['title'][:len(AT_TITLE)] == AT_TITLE):
            print(listing_id, title)

        # Clean up Vela DB, Load new shop
        log("Cleaning Vela DB")
        # Reset feature flags for features that are not in production yet
        self.db.reset_user_profile_flags(self.user_id, BETA_FEATURE_FLAGS)
        self.reload_shop()

        log("Making UI changes")
        self.go_to_bulk()
        bp = BulkPage(self.driver)

        # Edit title
        log("   title")
        bp.edit_part('Title').click()
        bp.select_operation('Add After')
        send_keys(bp.operation_input(), ' ' + timestamp)
        bp.operation_apply().click()

        # Edit description
        log("   description")
        bp.edit_part('Description').click()
        bp.select_operation('Add After')
        send_keys(bp.operation_input_description(), ' ' + timestamp)
        bp.operation_apply().click()

        # Edit category
        log("   category")
        bp.edit_part('Category').click()
        bp.select_category(AT_CATEGORIES)
        bp.operation_apply().click()

        # Edit photos
        log("   photos")
        bp.edit_part('Photos').click()
        with Photos(self.driver) as photos:
            for i, img in enumerate(AT_IMAGES):
                photos.select_photo(i, os.path.join(photos.photo_dir, img['file']))
            bp.operation_apply().click()

        # Edit tags
        log("   tags")
        bp.edit_part('Tags').click()
        send_keys(bp.operation_input(), ', '.join(AT_TAGS))
        bp.operation_apply().click()

        # Edit materials
        log("   materials")
        bp.edit_part('Materials').click()
        send_keys(bp.operation_input(), ', '.join(AT_MATERIALS))
        bp.operation_apply().click()

        # Edit section
        log("   section")
        bp.edit_part('Section').click()
        bp.operation_select().click()
        sleep(2)
        send_keys(bp.operation_menu_new_item_input(), AT_SECTION + Keys.RETURN)
        bp.operation_apply().click()

        # Edit Occasion
        log("   occasion")
        bp.edit_part('Occasion').click()
        bp.select_occasion(AT_OCCASION)
        bp.operation_apply().click()

        # Edit Holiday
        log("   holiday")
        bp.edit_part('Holiday').click()
        bp.select_holiday(AT_HOLIDAY)
        bp.operation_apply().click()

        # Edit variations
        log("   variations")
        bp.edit_part('Variations').click()
        biv = BulkPageInventoryVariations(self.driver, self.ts)
        bp.select_category(AT_CATEGORIES)
        bulk_row = biv.bulk_edit_row
        biv.set_property(bulk_row, 0, AT_VAR_PROPERTY_NAME)
        for option_name in AT_VAR_OPTION_VALUES:
            biv.add_option(bulk_row, 0, option_name)
        bp.operation_apply().click()

        # Edit price
        log("   price")
        bp.edit_part('Price').click()
        bip = BulkPageInventoryPrice(self.driver, self.ts)
        bip.select_operation('Change To')
        input_field = bip.operation_input()
        send_keys(input_field, AT_PRICE)
        bp.operation_apply().click()

        # Edit quantity
        log("   quantity")
        bp.edit_part('Quantity').click()
        biq = BulkPageInventoryQuantity(self.driver, self.ts)
        biq.select_operation('Change To')
        input_field = biq.operation_input()
        send_keys(input_field, str(AT_QUANTITY))
        biq.operation_apply().click()

        # Edit Sku
        log("   sku")
        bp.edit_part('SKU').click()
        bis = BulkPageInventorySku(self.driver, self.ts)
        input_field = bis.operation_input()
        send_keys(input_field, AT_SKU)
        bis.operation_apply().click()

        # Sync Updates
        log("Syncing Updates")
        bp.sync_updates_button().click()
        sleep(10)
        self.wait_for_synced()

        # Get listings from Etsy
        data = etsy.get_at_listings_details()
        self.validate_listings(data, timestamp)

        # Check logs for errors
        logs.check_for_errors()

