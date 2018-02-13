# /usr/bin/env python
import pytest
from tests.base import BaseTestClass, run_sql
from modules.selenium_tools import click, wait_for_web_assert
from modules.rabbit import setup_rabbit
from tests.etsy_emulator_support import EtsyEmulatorInterface
import tests.vela_control as vela
from pages.main_page import MainPage
from pages.login_page import LoginPage
from pages.bulk_page import BulkPage
from fixtures.fixtures import test_id, s3cleanup, rabbit_init, reload, login, select_listings_to_edit
from flaky import flaky
import tempfile
import shutil
import os

IMAGE_DIR_NAME = 'qa-img'


def setup_module(module):
    global tmp_dirname
    tmp_dirname = tempfile.mkdtemp()
    print('*** created temp directory ' + tmp_dirname + ' ***')
    # copy image files to temp directory
    shutil.copytree(IMAGE_DIR_NAME, os.path.join(tmp_dirname, IMAGE_DIR_NAME))


def teardown_module(module):
    global tmp_dirname
    print('*** deleting temp directory  ' + tmp_dirname + ' ***')
    shutil.rmtree(tmp_dirname)


def full_path(file_name):
    global tmp_dirname
    return os.path.join(tmp_dirname, IMAGE_DIR_NAME, file_name)


def check_etsy_emulator_requests(expected_api_calls):
    emulator_interface = EtsyEmulatorInterface()

    # Check Etsy API calls
    emulator_interface.validate_api_calls(expected_api_calls,
                                          sort=True,
                                          normalize_func=emulator_interface.normalize_update_api_calls,
                                          message='Unexpected API requests')


@pytest.mark.usefixtures("test_status", "test_id", "s3cleanup")
@flaky
class TestBulkPhotos(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        try:
            self.stop_all(self)
            self.set_etsy_testcase(self, 'tc1')
            run_sql('HIVE', "listings_03", retry=2)
            run_sql('HIVE', 'update_shops_timestamp', retry=2)
            self.restart_all(self)
        except Exception as e:
            print('*** setup_class failed: ' + str(e) + ' ***')
            raise

    def setup_method(self, method):
        super().setup_method(method)
        lpg = LoginPage(self.driver)
        lpg.login(page=self.login_url_http)

        mp = MainPage(self.driver)
        bp = BulkPage(self.driver)
        mp.select_listings_to_edit()
        click(bp.edit_part('Photos'))

    # --- Tests ---

    def test_bulk_photo(self):
        """ Tests photos can be added, replaced, deleted
        """

        d = self.driver
        bp = BulkPage(d)

        # add bulk photos
        bp.select_photo(0, full_path('onion.jpg'))
        bp.select_photo(1, full_path('bunny.jpeg'))
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        # add individual photos
        row = bp.listing_row('Second something 1235 (2)')
        photos = bp.row_photo_elements(row)
        bp.select_image(photos[2], full_path('jmeter.png'))
        bp.select_image(photos[3], full_path('ario.png'))

        # replace images
        bp.select_operation('Replace')
        bp.select_photo(3, full_path('mail.png'))
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

        # delete images
        bp.select_operation('Delete')
        photos = bp.bulk_photo_elements()
        click(photos[2])
        click(bp.operation_apply())

        apply_class = bp.operation_apply().get_attribute('class')
        assert 'inactive' in apply_class.split(' ')

    def test_too_large_and_small_bulk_photo(self):
        """"edit bulk photo. Add too large picture more than 1500px height or width
        error bubble should be displayed and disapper after few seconds
        than try to upload too small picture of size len than 50px height or width"""

        d = self.driver
        bp = BulkPage(d)

        # add small photo
        bp.select_photo(0, full_path('small.png'))
        assert bp.error_baloon_pictures() == ['Height and width must each be at least 50px']

        # add too large photo
        bp.select_photo(0, full_path('too_big.jpg'))
        assert bp.error_baloon_pictures() == ['Height and width must each be at most 3000px']


@pytest.mark.usefixtures("test_status", "test_id", "s3cleanup", "rabbit_init", "reload", "login", "select_listings_to_edit")
@flaky
class TestBulkPhotosSync(BaseTestClass):

    def setup_class(self):
        super().setup_class(self)
        self.etsy_testcase = 'listings_push_images'
        self.sql_file = 'listings_14'    # will be loaded by 'reload' fixture
        self.listings_to_select = 'ALL'   # used by select_listings_to_edit fixture
        self.listing_status = 'Active'    # used by select_listings_to_edit fixture
        self.bulk_tab = 'Photos'     # used by select_listings_to_edit fixture

    # --- Tests ---

    def test_inline_add_photo_sync(self):
        """ Test adding a picture using inline edit and syncing it to Etsy
        """

        # the last API call doesn't show actual picture data, because we don't have multipart support in emulator
        expected_api_calls = [
            {
                'DELETE': '/v2/listings/100001/images/1224764834',
                'body': {}
            }, {
                'POST': '/v2/listings/100001/images',
                'body': {
                    'listing_id': '100001',
                    'listing_image_id': '1224764834',
                    'overwrite': '1',
                    'rank': '1'
                }
            }, {
                'POST': '/v2/listings/100001/images',
                'body': {
                    'listing_id': '100001',
                    'overwrite': '1',
                    'rank': '2'
                }
            }
        ]

        bp = BulkPage(self.driver)

        # Add a photo to a listing
        bp.select_single_photo('One', 1, full_path('onion.jpg'))

        # Check that sync button is enabled and blue dot is displayed after clicking on Apply
        wait_for_web_assert(True, bp.sync_updates_button().is_enabled,
                            'Sync button is not enabled')
        assert bp.is_part_modified('Photos') is True, 'Blue dot didn\'t show up'

        # Sync changes
        click(bp.sync_updates_button())

        # Check that sync button is disabled and blue dot is not displayed after clicking on Sync
        wait_for_web_assert(False, bp.sync_updates_button().is_enabled,
                            'Sync button is not disabled')
        assert bp.is_part_modified('Photos') is False, 'Blue dot is still shown'

        # Wait for shop to sync and check requests made to Etsy
        vela.wait_for_shop_to_sync(expected_status='up_to_date')
        check_etsy_emulator_requests(expected_api_calls)
