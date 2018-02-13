import pytest

from modules.rabbit import setup_rabbit
from pages.bulk_page import BulkPage
from pages.login_page import LoginPage
from pages.main_page import MainPage
from tests.base import run_sql
from modules.selenium_tools import click
from tests.s3_support import S3Interface


@pytest.fixture()
def login(request):
    self = request.node.parent.obj
    lpg = LoginPage(self.driver)
    lpg.login(page=self.login_url_http)


@pytest.fixture()
def test_id(request):
    """
    set self.test_id
    """
    self = request.node.parent.obj
    self.test_id = request.node.name

@pytest.fixture()
def reload(request):
    """
    stop servers, init etsy emulator, load `self.sql_file` to the db, start servers
    """
    self = request.node.parent.obj
    self.stop_all()
    try:
        etsy_testcase = self.etsy_testcase
    except AttributeError:
        etsy_testcase = 'tc1'
    self.set_etsy_testcase(etsy_testcase)
    run_sql('HIVE', self.sql_file, retry=2)
    run_sql('HIVE', 'update_shops_timestamp', retry=2)
    self.restart_all()
    self.driver.get(self.base_url)

@pytest.fixture()
def s3cleanup(request):
    """ Cleanup s3 for a test
    """
    s3interface = S3Interface()

    deleted = s3interface.delete_all_images()
    print('Deleted %d object(s) from S3 bucket "%s" using prefix "%s"' % (
        len(deleted), s3interface.bucket_name, s3interface.prefix))

@pytest.fixture()
def rabbit_init(request):
    """ Setup rabbit queues for a test - in some cases it is necessary to prepare the rabbit setup from scratch
        We should ideally do it for each test to start from a clean slate.
    """
    setup_rabbit()

@pytest.fixture()
def select_listings_to_edit(request):
    """
    select listings for bulk,
      - self.listings_to_select is on of:
            None -> use default
            ["listing1", "listin2"...] -> use this
            "ALL" -> select all
      - self.listing_status  -> e.g. 'Draft'
      - choose `self.bulk_tab`

    """
    self = request.node.parent.obj

    mp = MainPage(self.driver)
    bp = BulkPage(self.driver)

    try:
        listing_status = self.listing_status
    except AttributeError:
        listing_status = None

    try:
        listings_to_select = self.listings_to_select
    except AttributeError:
        listings_to_select = None

    try:
        bulk_tab = self.bulk_tab
    except AttributeError:
        bulk_tab = None

    mp.select_listings_to_edit(listings_to_select, status=listing_status)
    if bulk_tab:
        click(bp.edit_part(bulk_tab))
