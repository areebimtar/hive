from collections import namedtuple
from datetime import datetime
import errno
import logging
import os
import sys
from time import sleep
import traceback

from json.decoder import JSONDecodeError
from enum import Enum
from time import strftime, perf_counter

import arrow
import boto3
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

import modules.testing as testing
from modules.etsy_api import EtsyAPI
from modules.hivedb import HiveDatabase, ShopInfoCols, ShopSyncStatus
from modules.json_config import JSONConfig
from modules.shopify_api import ShopifyAPI
from modules.slack import SlackClient
from pages.bulk_page import BulkPage
from pages.login_page import LoginPage
from pages.main_page import MainPage
from pages.welcome_page import WelcomePage

SCRIPT_PATH = os.path.dirname(os.path.realpath(__file__))

GLOBAL_CONFIG_FILENAME = 'config.json'

DEFAULT_SELENIUM_TIMEOUT_SEC = 15

VERIFY_ATTEMPTS = 3
VERIFY_ATTEMPTS_DELAY_SEC = 5

CHECK_SHOP_SYNC_STATUS_DELAY_SEC = 1

REMOTE_DRIVER_URL = 'http://127.0.0.1:4444/wd/hub'


class Result(Enum):
    SUCCESS = 'SUCCESS'
    ERROR = 'ERROR'
    WARNING = 'WARNING'
    FAIL = 'FAIL'

ICONS = {
    Result.SUCCESS: ':white_check_mark:',
    Result.ERROR: ':boom:',
    Result.WARNING: ':warning:',
    Result.FAIL: ':fail:'
}


class DBControlError(Exception):
    pass


class DBControlTimeoutError(Exception):
    pass


class VelaGuiError(Exception):
    pass


class VelaGuiSeleniumInitError(VelaGuiError):
    pass


class VelaGuiSaveScreenshotError(VelaGuiError):
    pass


class VelaGuiTimeoutError(VelaGuiError):
    pass


class VelaGuiBrowserAutomationError(VelaGuiError):
    pass


class HealthCheckException(Exception):
    pass


class HealthCheckWarning(HealthCheckException):
    pass


class HealthCheckError(HealthCheckException):
    pass


class HealthCheckFailed(HealthCheckException):
    pass


class VelaGuiControl(object):
    """
    Class that handles VELA browser automation for health-check
    """
    def __init__(self, cfg: JSONConfig, timestamp: str):
        self.cfg = cfg
        self.timestamp = timestamp
        self.current_action = None
        self.driver = None

    def __del__(self):
        if self.driver:
            self.driver.quit()
            del self.driver

    def _init_webdriver(self):
        self._log_action('init browser')

        options = webdriver.ChromeOptions()
        options.add_argument('headless')  # requires at least selenium 3.8.1 and Chrome 63.0 (verified combination)
        self.driver = webdriver.Remote(command_executor=REMOTE_DRIVER_URL,
                                       desired_capabilities=DesiredCapabilities.CHROME,
                                       options=options)
        self.driver.implicitly_wait(DEFAULT_SELENIUM_TIMEOUT_SEC)
        self.driver.set_window_size(1280, 1024)

    def _login(self):
        lp = LoginPage(self.driver)

        if self.cfg.skip_welcome_page is False:
            wp = WelcomePage(self.driver)
            self._log_action('open welcome page')
            wp.sign_in(self.cfg.welcome_page)
            self._log_action('login as ' + self.cfg.vela.user)
            lp.login(user=self.cfg.vela.user, password=self.cfg.vela.password)
        else:
            self._log_action('login as ' + self.cfg.vela.user)
            lp.login(user=self.cfg.vela.user,
                     password=self.cfg.vela.password,
                     page=self.cfg.login_page)

    def _log_action(self, action: str):
        self.current_action = action
        logging.info('Browser action: ' + action)

    def _go_to_bulk(self, title_start, listing_status):
        mp = MainPage(self.driver)
        shop_name = self.cfg.vela.shop_name
        self._log_action('choose shop ' + self.cfg.vela.shop_name)
        if mp.shop_name_text() != shop_name:
            mp.change_shop(shop_name)

        self._log_action('select listings to edit')
        mp.select_listings_to_edit(checked_listings='ALL',
                                   status=listing_status,
                                   filter=title_start)

    def _change_and_sync(self, new_title: str):
        self._log_action('check listings in bulk page')
        bp = BulkPage(self.driver)
        titles = bp.listing_titles()
        num_listings = len(titles)
        assert num_listings == 1, 'Expected one listing in VELA bulk editor, got %d' % num_listings

        self._log_action('change title')
        bp.set_single_title(titles[0], new_title)
        self._log_action('save and sync changes')
        timeout_sec = self.cfg.timeout_save_changes_to_vela_sec
        try:
            bp.sync_changes(timeout_sec=timeout_sec)
        except AssertionError:
            raise VelaGuiTimeoutError('Changes not saved to VELA in time, timeout reached (%d seconds)' % timeout_sec)

    def save_screenshot_and_page(self):
        if not self.driver:
            raise VelaGuiSaveScreenshotError('Not possible to save screenshot, selenium not connected')

        rel_path = os.path.join(self.cfg.channel, self.cfg.db.name, self.timestamp)
        path = os.path.join(self.cfg.screenshot_path, rel_path)
        try:
            os.makedirs(path)
        except OSError as e:
            if e.errno != errno.EEXIST:
                logging.error(str(e))
                raise VelaGuiSaveScreenshotError('Failed to create directory for screenshot: %s ' % path)
        filename = os.path.join(path, 'screenshot.png')

        try:
            self.driver.save_screenshot(filename)
        except Exception:
            logging.error(traceback.format_exc())
            raise VelaGuiSaveScreenshotError('Failed to save screenshot to %s' % filename)

        filename = os.path.join(path, 'page.html')
        try:
            with open(filename, 'w') as f:
                f.write(self.driver.page_source)
        except Exception:
            logging.error(traceback.format_exc())
            raise VelaGuiSaveScreenshotError('Failed to save page source to %s' % filename)

        return rel_path

    def change_title_in_vela(self, listing_status: str, title_start: str, new_title: str):

        logging.info('Changing title in VELA to ' + new_title)
        try:
            self._init_webdriver()
        except Exception:
            logging.error(traceback.format_exc())
            raise VelaGuiSeleniumInitError('Failed to init selenium')

        try:
            self._login()
            self._go_to_bulk(title_start, listing_status)
            self._change_and_sync(new_title)
        except VelaGuiError:
            raise
        except Exception:
            logging.error(traceback.format_exc())
            raise VelaGuiBrowserAutomationError(
                'Browser action error, failed action: %s' % self.current_action)


class EtsyApiControl(object):
    """
    Class that provides means to work simply with Etsy listings (products) via Etsy API for Health-Check
    """
    def __init__(self, consumer_key, consumer_secret, token, secret):
        credentials = {
            'CLIENT_KEY': consumer_key,
            'CLIENT_SECRET': consumer_secret,
            'AUTHORIZED_OAUTH_TOKEN': token,
            'AUTHORIZED_OAUTH_TOKEN_SECRET': secret,
        }
        self.api = EtsyAPI(credentials)

    def _find_listing(self, title_start: str, listing_state: str):
        listings = self.api.get_listings(listing_state.lower())
        found = [listing for listing in listings if listing['title'].startswith(title_start)]
        len_found = len(found)
        assert len_found == 1, 'Expected one listing on Etsy for %s, got %d' % (title_start, len_found)
        return found[0]

    def get_title_from_etsy(self, title_start: str, listing_state: str):
        return self._find_listing(title_start, listing_state)['title']

    def change_title_on_etsy(self, title_start: str, new_title: str, listing_state: str):
        logging.info('Changing title on Etsy to ' + new_title)
        listing_id = self._find_listing(title_start, listing_state)['listing_id']
        listing = self.api.change_listing_title(listing_id, listing_state, new_title)
        assert listing['title'] == new_title, 'Title was not changed on Etsy for product ' + new_title


class ShopifyApiControl(object):
    """
    Class that provides means to work simply with Shopify products (listings) via Shopify API for Health-Check
    """
    def __init__(self, shop_domain: str, token: str):
        self.api = ShopifyAPI(shop_domain, token)

    def _find_product(self, title_start: str):
        products = self.api.get_products(fields='id,title')
        found = [product for product in products if product['title'].startswith(title_start)]
        len_found = len(found)
        assert len_found == 1, 'Expected one product on Shopify for %s, got %d' % (title_start, len_found)
        return found[0]

    def get_title_from_from_shopify(self, title_start: str):
        return self._find_product(title_start)['title']

    def change_title_on_shopify(self, title_start: str, new_title: str):
        logging.info('Changing title on Shopify to ' + new_title)
        product_id = self._find_product(title_start)['id']
        product = self.api.change_title(product_id, new_title)
        assert product['title'] == new_title, 'Title was not changed on Shopify for product ' + new_title


class DatabaseControl(object):
    """
    Class that provides means to work simply with VELA DB for Health-Check
    """
    def __init__(self, cfg: JSONConfig):
        self.cfg = cfg
        self.db = HiveDatabase(self.cfg.db.url)
        self.shop_id = self.db.get_shop_id(self.cfg.vela.shop_name)
        self.sync_status = None
        self.last_sync_timestamp = None

    def _store_shop_sync_info(self):
        (self.sync_status, self.last_sync_timestamp) = \
            self.db.get_shop_info(self.shop_id, columns=[ShopInfoCols.SYNC_STATUS, ShopInfoCols.LAST_SYNC_TIMESTAMP])

    def _get_current_sync_status(self):
        self._store_shop_sync_info()
        return self.sync_status

    def wait_for_shop_up_to_date(self, timeout_sec: int):
        logging.info('Waiting for shop to be up to date')

        try:
            testing.wait_for_assert(ShopSyncStatus.UP_TO_DATE.value,
                                    lambda: self._get_current_sync_status(),
                                    retries=int(timeout_sec / 5) - 1,
                                    delay_sec=5,
                                    print_data=False)
        except AssertionError:
            raise DBControlTimeoutError('Shop is not up to date, timeout reached')
        else:
            return True
        finally:
            logging.info('Shop sync state: {} Last Sync Time: {}'.format(self.sync_status, self.last_sync_timestamp))

    def wait_for_shop_start_and_finish_syncing(self, timeout_sec: int, last_sync_timestamp: datetime):

        def _synced():
            return self.sync_status == ShopSyncStatus.UP_TO_DATE.value and last_timestamp > original_timestamp

        logging.info('Waiting for shop to be synced')
        original_timestamp = arrow.get(last_sync_timestamp)
        for i in range(int(timeout_sec / CHECK_SHOP_SYNC_STATUS_DELAY_SEC), -1, -1):
            self._store_shop_sync_info()
            last_timestamp = arrow.get(self.last_sync_timestamp)
            if _synced():
                logging.info(
                    'Shop sync state: {} Last Sync Time: {}'.format(self.sync_status, self.last_sync_timestamp))
                break
            if i:
                sleep(CHECK_SHOP_SYNC_STATUS_DELAY_SEC)
        else:
            logging.info('Shop sync state: {} Last Sync Time: {}'.format(self.sync_status, self.last_sync_timestamp))
            raise DBControlTimeoutError('Shop is not synced, timeout reached')

    def get_etsy_title(self, title_start: str):
        listings = self.db.find_etsy_products(self.shop_id, title_start + '%')
        len_listings = len(listings)
        assert len_listings == 1, 'Expected one product in DB for %s - got %d' % (title_start, len_listings)
        return listings[0][1]

    def get_shopify_title(self, title_start: str):
        products = self.db.find_shopify_products(self.shop_id, title_start + '%')
        len_products = len(products)
        assert len_products == 1, 'Expected one product in DB for %s - got %d' % (title_start, len_products)
        return products[0][1]

    def get_shop_tokens(self):
        return self.db.get_shop_tokens(self.shop_id)

    def get_shop_domain(self):
        return self.db.get_shop_domain(self.shop_id)


class ScreenshotResult(namedtuple('ScreenshotResult','screenshot_saved screenshot_path error_message')):
    pass


class HealthCheck(object):
    """
    Generic class that contains main functionality for Health-check
    It is necessary to derive channel specific class from this class

    1. Shop status is checked before start
    2. Listing1 is changed in VELA and synced to the shop
    3. Listing2 is changed directly in the shop and should be synced to VELA
    4. Shop is synced
    5. Both listings are verified on both sides
    """
    def __init__(self, timestamp: str, cfg: JSONConfig):
        self.timestamp = timestamp
        self.cfg = cfg
        self.vela_gui = VelaGuiControl(cfg, timestamp)
        self.db_control = DatabaseControl(cfg)
        self.errors = []
        self.title1_start = cfg.listing1.title_start
        self.title2_start = cfg.listing2.title_start
        self.new_title1 = '%s %s' % (self.title1_start, timestamp)
        self.new_title2 = '%s %s' % (self.title2_start, timestamp)
        self.shop_title1 = None
        self.shop_title2 = None
        self.vela_title1 = None
        self.vela_title2 = None
        self.previous_sync_timestamp = None

    def _change_title_in_shop(self):
        raise NotImplemented('Subclass must implement this method')

    def _get_titles_from_shop(self):
        raise NotImplemented('Subclass must implement this method')

    def _get_titles_from_database(self):
        raise NotImplemented('Subclass must implement this method')

    @staticmethod
    def _titles_match(expected_title: str, actual_title: str):
        logging.info('Checking title, expected: ' + expected_title)
        logging.info('Got: ' + actual_title)

        if expected_title == actual_title:
            return True
        else:
            logging.error('Titles don\'t match')
            return False

    def _are_titles_in_shop_correct(self):
        logging.info('Checking titles through %s API' % self.cfg.channel)
        titles_correct = True
        if not self._titles_match(self.new_title2, self.shop_title2):
            self.errors.append(
                'Unexpected Listing 2 title in %s shop, was it overwritten by somebody?' % self.cfg.channel)
            titles_correct = False
        if not self._titles_match(self.new_title1, self.shop_title1):
            self.errors.append('Listing 1 was not synced from VELA to %s ' % self.cfg.channel)
            titles_correct = False
        return titles_correct

    def _are_titles_in_db_correct(self):
        titles_correct = True
        logging.info('Checking titles in VELA database')
        if not self._titles_match(self.new_title1, self.vela_title1):
            titles_correct = False
            self.errors.append(
                'Listing 1 either wasn\'t correctly saved to VELA DB or it was overwritten from %s' % self.cfg.channel)
        if not self._titles_match(self.new_title2, self.vela_title2):
            titles_correct = False
            self.errors.append('Listing 2 wasn\'t synced from %s to VELA' % self.cfg.channel)
        return titles_correct

    def _check_shop_sync(self):
        try:
            self.db_control.wait_for_shop_up_to_date(self.cfg.timeout_shop_not_ready_sec)
        except DBControlTimeoutError:
            sync_status = self.db_control.sync_status
            raise HealthCheckFailed('Shop %s is still not up to date, can\'t start health check. Sync status: %s' %
                                    (self.cfg.vela.shop_name, sync_status))
        self.previous_sync_timestamp = self.db_control.last_sync_timestamp

    def _change_title_in_vela(self):
        try:
            self.vela_gui.change_title_in_vela(self.cfg.listing1.state, self.title1_start, self.new_title1)
        except VelaGuiBrowserAutomationError as e:
            screenshot_result = self._save_screenshot()
            raise HealthCheckFailed(e, screenshot_result)
        except VelaGuiTimeoutError as e:
            screenshot_result = self._save_screenshot()
            raise HealthCheckFailed(e, screenshot_result)
        except VelaGuiSeleniumInitError as e:
            raise HealthCheckError(e)
        except VelaGuiError as e:
            screenshot_result = self._save_screenshot()
            raise HealthCheckError(e, screenshot_result)

    def _save_screenshot(self):

        try:
            rel_path = self.vela_gui.save_screenshot_and_page()
        except VelaGuiSaveScreenshotError as e:
            rel_path = ''
            screenshot_saved = False
            error_message = str(e)
        else:
            screenshot_saved = True
            error_message = ''

        return ScreenshotResult(screenshot_saved, rel_path, error_message)

    def _wait_for_synced(self):
        timeout_sec = self.cfg.timeout_sync_from_vela_sec
        try:
            self.db_control.wait_for_shop_start_and_finish_syncing(timeout_sec, self.previous_sync_timestamp)
        except DBControlTimeoutError:
            last_sync_timestamp = self.db_control.last_sync_timestamp
            if last_sync_timestamp == self.previous_sync_timestamp:
                raise HealthCheckFailed('Shop %s didn\'t start syncing, timeout reached (%d seconds)' %
                                        (self.cfg.vela.shop_name, timeout_sec))
            else:
                raise HealthCheckFailed('Shop %s didn\'t still not synced, timeout reached (%d seconds)' %
                                        (self.cfg.vela.shop_name, timeout_sec))

    def _all_titles_match(self):
        titles_match = True
        if not self._are_titles_in_db_correct():
            titles_match = False
        if not self._are_titles_in_shop_correct():
            titles_match = False
        return titles_match

    def test_setup(self):
        self._check_shop_sync()
        self._change_title_in_shop()
        self._change_title_in_vela()
        sync_time_start = perf_counter()
        self._wait_for_synced()
        sync_time_diff_sec = round(perf_counter() - sync_time_start)
        logging.info('Sync of the shop took %d seconds' % sync_time_diff_sec)

        for i in range(VERIFY_ATTEMPTS - 1, -1, -1):
            self.errors = []
            logging.info('Getting listings from %s' % self.cfg.channel)
            self._get_titles_from_shop()
            logging.info('Getting listings from VELA database')
            self._get_titles_from_database()
            logging.info('Verifying listing titles')
            if self._all_titles_match():
                break
            if i:
                sleep(VERIFY_ATTEMPTS_DELAY_SEC)
        else:
            raise HealthCheckFailed('\n'.join(self.errors))

        return sync_time_diff_sec


class EtsyHealthCheck(HealthCheck):
    """
    Etsy specific class that contains main functionality for Health-check
    """
    def __init__(self, timestamp: str, cfg: JSONConfig):
        super().__init__(timestamp, cfg)
        (token, secret) = self.db_control.get_shop_tokens()
        self.etsy_control = EtsyApiControl(self.cfg.etsy.consumer_key, self.cfg.etsy.consumer_secret, token, secret)

    def _change_title_in_shop(self):
        self.etsy_control.change_title_on_etsy(self.title2_start, self.new_title2, self.cfg.listing1.state)

    def _get_titles_from_shop(self):
        self.shop_title1 = self.etsy_control.get_title_from_etsy(self.title1_start, self.cfg.listing1.state)
        self.shop_title2 = self.etsy_control.get_title_from_etsy(self.title2_start, self.cfg.listing2.state)

    def _get_titles_from_database(self):
        self.vela_title1 = self.db_control.get_etsy_title(self.title1_start)
        self.vela_title2 = self.db_control.get_etsy_title(self.title2_start)


class ShopifyHealthCheck(HealthCheck):
    """
    Shopify specific class that contains main functionality for Health-check
    """
    def __init__(self, timestamp: str, cfg: JSONConfig):
        super().__init__(timestamp, cfg)
        (token, _) = self.db_control.get_shop_tokens()
        shop_domain = self.db_control.get_shop_domain()
        self.shopify_control = ShopifyApiControl(shop_domain, token)

    def _change_title_in_shop(self):
        self.shopify_control.change_title_on_shopify(self.title2_start, self.new_title2)

    def _get_titles_from_shop(self):
        self.shop_title1 = self.shopify_control.get_title_from_from_shopify(self.title1_start)
        self.shop_title2 = self.shopify_control.get_title_from_from_shopify(self.title2_start)

    def _get_titles_from_database(self):
        self.vela_title1 = self.db_control.get_shopify_title(self.title1_start)
        self.vela_title2 = self.db_control.get_shopify_title(self.title2_start)


def load_configs():
    """
    Load configuration files
    :return: Config object
    """
    try:
        setup_config_filename = sys.argv[1]
    except IndexError:
        logging.error('Setup config file must be provided as command line parameter for %s' %
                      os.path.basename(__file__))
        exit(1)

    try:
        cfg = JSONConfig(os.path.join(SCRIPT_PATH, GLOBAL_CONFIG_FILENAME), setup_config_filename)
    except OSError as e:
        logging.error('Failed to open config file')
        logging.error(str(e))
        exit(1)
    except JSONDecodeError as e:
        logging.error('Invalid format of JSON file')
        logging.error(str(e))
        exit(1)

    return cfg


def send_slack_message(cfg: JSONConfig, result: Result, error: str, screenshot_result: ScreenshotResult=None):
    """
    Sends Slack message
    :param cfg: Config object
    :param result: Result object
    :param error: Error message
    :param screenshot_result: ScreeshotResult object
    """

    logging.info('Sending message to Slack')

    slack_client = SlackClient(cfg.slack.client_key, cfg.slack.access_token)
    slack_channels = cfg.slack.channels[result.value.lower()]
    for slack_channel in slack_channels.split(','):
        message = '%s Vela health check %s (%s, %s)\n%s' % \
                  (ICONS[result], result.value, cfg.channel, cfg.db.name, error)

        if screenshot_result:
            if screenshot_result.screenshot_saved:
                message += '\nSee %s/%s/' % (cfg.screenshot_url, screenshot_result.screenshot_path)
            elif screenshot_result.error_message:
                message += '\n%s' % screenshot_result.error_message

        slack_client.send_message(slack_channel, message)


def send_metric_to_aws(cfg: JSONConfig, sync_shop_sec: (int, float)):
    """
    Sends metric to AWS Cloudwatch

    :param cfg: Config object
    :param sync_shop_sec: measured duration of the sync shop
    """

    logging.info('Sending metric to AWS')
    namespace = cfg.db.name
    metric_data = [
        {
            'MetricName': cfg.aws_metric_name,
            'Dimensions': [
                {
                    'Name': 'channel',
                    'Value': cfg.channel
                },
            ],
            'Timestamp': datetime.utcnow(),
            'Value': float(sync_shop_sec),
            'Unit': 'Seconds'
        }
    ]
    client = boto3.client('cloudwatch',
                          region_name=cfg.aws.region_name,
                          aws_access_key_id=cfg.aws.access_key_id,
                          aws_secret_access_key=cfg.aws.secret_access_key)
    client.put_metric_data(Namespace=namespace, MetricData=metric_data)


def run_health_check(cfg: JSONConfig):
    """
    Main function that starts Health-check

    :param cfg: Config object
    :return how long it took to sync the shop
    """
    start_timestamp = strftime("%Y%m%d_%H%M%S")

    logging.info('Health-Check starting')
    logging.info('Checking channel %s, DB %s' % (cfg.channel, cfg.db.name))
    if cfg.channel == 'shopify':
        hc = ShopifyHealthCheck(start_timestamp, cfg)
        return hc.test_setup()
    elif cfg.channel == 'etsy':
        hc = EtsyHealthCheck(start_timestamp, cfg)
        return hc.test_setup()
    else:
        raise HealthCheckError('Invalid channel in config: ' + cfg.channel)


def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s:%(levelname)s:%(message)s')
    result = None
    screenshot_result = None
    message = ''
    sync_shop_sec = None
    exit_code = 0

    config = load_configs()

    try:
        sync_shop_sec = run_health_check(config)
    except HealthCheckError as e:
        message = e.args[0]
        logging.error(message)
        result = Result.ERROR
        try:
            screenshot_result = e.args[1]
        except IndexError:
            pass
    except HealthCheckFailed as e:
        message = e.args[0]
        logging.error(message)
        result = Result.FAIL
        try:
            screenshot_result = e.args[1]
        except IndexError:
            pass
    except KeyboardInterrupt:
        logging.info('Terminated on user request')
        sys.exit(0)
    except Exception as e:
        message = 'Unexpected health check error - %s: %s' % (type(e).__name__, str(e))
        logging.error(traceback.format_exc())
        result = Result.ERROR
    else:
        result = Result.SUCCESS
        message = 'Sync of the shop took %d seconds' % sync_shop_sec

    logging.info('Health-Check result: %s' % result.name)

    try:
        send_slack_message(config, result, message, screenshot_result)
    except Exception:
        logging.error('Failed to send message to Slack')
        logging.error(traceback.format_exc())
        exit_code = 1

    if result == Result.SUCCESS and config.send_metrics_to_aws:
        try:
            send_metric_to_aws(config, sync_shop_sec)
        except Exception:
            logging.error('Failed to send metric to AWS')
            logging.error(traceback.format_exc())
            exit_code = 1

    sys.exit(exit_code)

if __name__ == '__main__':
    main()
