import datetime
import os
from time import strftime, sleep

import psycopg2
import pytest
from selenium.webdriver.common.keys import Keys

import tests.vela_control as vela
from modules.hivedb import HiveDatabase
from modules.shopify_api import ShopifyAPI
from pages.bulk_page import BulkPage
from pages.login_page import LoginPage
from pages.main_page import MainPage
from tests.base import BaseTestClass
from modules.selenium_tools import send_keys
from modules.testing import wait_for_assert
from tests_e2e.modules.logs import Logs, log
from tests_e2e.modules.photos import Photos, compare_images

VELA_USER = os.environ['QA_VELA_USER']
VELA_PASSWORD = os.environ['QA_VELA_PASSWORD']

SHOP_SYNC_TIMEOUT = 120

FAKE_SYNC_TIME_STR = '2017-01-01 00:00:00.000+00'
FAKE_SYNC_TIME = datetime.datetime(2017, 1, 1, tzinfo=psycopg2.tz.FixedOffsetTimezone(offset=0, name=None))

# Feature flags for features that are not in production yet
BETA_FEATURE_FLAGS = []

NUMBER_OF_TEST_LISTINGS = 5

AT_TITLE_PREFIX = 'auto_test_listing_'
AT_DESCRIPTION = '<strong>Let\'s Test!</strong>'
AT_IMAGES = [
    {'file': 'onion.jpg', 'size': '78 x 118'},
    {'file': 'jmeter.png', 'size': '256 x 256'}
]
AT_TAGS = ['test-tag-01', 'test-tag-02']
AT_PRODUCT_TYPE = 'Test Product Type'
AT_VENDOR = 'Test Vendor'


def validate_listings(products, timestamp):
    assert len(products) == NUMBER_OF_TEST_LISTINGS, 'Incorrect number of listings found'

    for i, listing in enumerate(sorted(products, key=lambda item: item['title'])):
        title = '{}{:02d}'.format(AT_TITLE_PREFIX, i)
        log('Verifying ', title)

        assert listing['title'] == title + ' ' + timestamp
        assert listing['body_html'] == '<p>{}</p>{}'.format(timestamp, AT_DESCRIPTION)
        image_urls = [image['src'] for image in listing['images']]
        compare_images(image_urls, AT_IMAGES)
        assert listing['tags'] == ', '.join(AT_TAGS)
        assert listing['product_type'] == AT_PRODUCT_TYPE
        assert listing['vendor'] == AT_VENDOR


class ShopifyTestProducts(object):
    """ Class for handling of test products on Shopify
    """
    SHOPIFY_NEW_PRODUCT_TEMPLATE = {
        'title': 'Template title',
        'body_html': AT_DESCRIPTION,
        'vendor': 'Default vendor',
        'product_type': 'Default product',
    }

    def __init__(self, shop_domain: str, token: str, title_prefix: str):
        self._api = ShopifyAPI(shop_domain, token)
        self.title_prefix = title_prefix

    def create_test_products(self, num: int):
        new_ids = []
        for i in range(num):
            data = self.SHOPIFY_NEW_PRODUCT_TEMPLATE
            data['title'] = self.title_prefix + '%02d' % i
            created_product = self._api.create_product(data)
            new_ids.append(created_product['id'])

        return new_ids

    def get_test_products(self):
        all_products = self._api.get_products()
        test_products = \
            [product for product in all_products if product['title'].startswith(self.title_prefix)]
        return test_products

    def delete_test_products(self):
        all_products = self._api.get_products(fields='id,title')
        test_product_ids = \
            [product['id'] for product in all_products if product['title'].startswith(self.title_prefix)]

        for product_id in test_product_ids:
            self._api.delete_product(product_id)

        return test_product_ids


@pytest.mark.usefixtures("test_status")
class TestShopifyUpload(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.db = HiveDatabase(os.environ['DATABASE_URL'])
        self.shop_name = os.environ['SHOP_NAME']
        self.shop_id = self.db.get_shop_id(self.shop_name)
        self.shop_domain = self.db.get_shop_domain(self.shop_id)
        (self.shop_token, _) = self.db.get_shop_tokens(self.shop_id)
        self.user_id = self.db.get_user_id(VELA_USER)

    def go_to_bulk(self, shop_name):
        # log in
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_https, user=VELA_USER, password=VELA_PASSWORD)

        # switch the shop if needed
        mp = MainPage(self.driver)
        if mp.shop_name_text() != shop_name:
            mp.change_shop(shop_name)

        # select listings to edit
        listings_titles = ['{}{:02d}'.format(AT_TITLE_PREFIX, i) for i in range(NUMBER_OF_TEST_LISTINGS)]
        mp.select_listings_to_edit(checked_listings=listings_titles, filter='auto_')

    def reload_shopify_shop(self):
        self.db.set_shop_last_sync_time(self.shop_id, FAKE_SYNC_TIME_STR)
        vela.trigger_shopify_shop_sync(self.user_id, self.shop_id)

        print("Waiting for shop to download ")
        for i in range(SHOP_SYNC_TIMEOUT):
            sleep(1)
            if self.db.get_shop_last_sync_time(self.shop_id) != FAKE_SYNC_TIME:
                break
        assert self.db.get_shop_last_sync_time(self.shop_id) != FAKE_SYNC_TIME,\
            "Shop " + str(self.shop_id) + " is not 'up_to_date'"

    def wait_for_synced(self):
        log("Waiting for changes to be uploaded to Shopify")
        wait_for_assert('up_to_date',
                        lambda: self.db.get_shop_status(self.shop_id),
                        'Shop not synced',
                        retries=SHOP_SYNC_TIMEOUT)
        log("Shop synced")

    def test_shopify_upload(self):
        """
        Verify that listings can be fetched from Shopify, changed in vela GUI and pushed back to Shopify
        """

        # --- Preparation ----

        # Delete log files
        logs = Logs(os.environ['LOG_CLEAN_SCRIPT'], os.environ['LOG_GREP_SCRIPT'])
        logs.empty()

        timestamp = strftime("%Y%m%d_%H%M%S")

        # Remove test listings on shopify and create them again there
        test_listings = ShopifyTestProducts(self.shop_domain, self.shop_token, AT_TITLE_PREFIX)

        log('Removing AT listings from Shopify')
        ids = test_listings.delete_test_products()
        log('Removed listings: ' + ', '.join(map(str, ids)))

        log('Creating AT listings on Shopify')
        ids = test_listings.create_test_products(NUMBER_OF_TEST_LISTINGS)
        log('Created listings: ' + ', '.join(map(str, ids)))

        # Reload shop - sync from Shopify and disable beta features we don't want to test
        self.reload_shopify_shop()
        self.db.reset_user_profile_flags(self.user_id, BETA_FEATURE_FLAGS)

        # --- Start testing in UI ---

        log("Making UI changes")
        self.go_to_bulk(self.shop_name)
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
        bp.select_operation('Add Before')
        send_keys(bp.operation_edit_area_description(), timestamp)
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

        # Edit section
        log("   product type")
        bp.edit_part('Product Type').click()
        bp.operation_select().click()
        sleep(2)
        send_keys(bp.operation_menu_new_item_input(), AT_PRODUCT_TYPE + Keys.RETURN)
        bp.operation_apply().click()

        # Edit section
        log("   vendor")
        bp.edit_part('Vendor').click()
        bp.operation_select().click()
        sleep(2)
        send_keys(bp.operation_menu_new_item_input(), AT_VENDOR + Keys.RETURN)
        bp.operation_apply().click()

        # Sync Updates
        log("Syncing Updates")
        bp.sync_updates_button().click()
        sleep(5)
        self.wait_for_synced()

        # Get test listings from Shopify and verify them
        data = test_listings.get_test_products()
        validate_listings(data, timestamp)

        # Check logs for errors
        logs.check_for_errors()
