# /usr/bin/env python
import os
import re
from enum import Enum
from subprocess import call
from tempfile import NamedTemporaryFile
from time import sleep

import requests
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from shishito.conf.conftest import get_test_info
from shishito.runtime.shishito_support import ShishitoSupport
from shishito.ui.selenium_support import SeleniumTest

from modules.selenium_tools import click
from tests.etsy_emulator_support import EtsyEmulatorInterface, EtsyEmulatorRequestError

DB_DIR = os.path.dirname(__file__) + '/../sql'
BIN_DIR = os.path.dirname(__file__) + '/../bin'
BACKSPACE_KEYS = Keys.BACKSPACE * 10

# we either build the connection string or read it whole from environment variable if not possible to build it
try:
    HIVE_DATABASE_URL = ''.join([
        'postgres://',
        os.environ['QA_PGUSER'],
        ':',
        os.environ['QA_PGPASSWORD'],
        '@',
        os.environ['QA_PGHOST'],
        ':',
        os.environ['QA_PGPORT'],
        '/',
        os.environ['QA_INSTANCE'] + '_' + os.environ['QA_INSTANCE_VIRT'] + '_' + os.environ['QA_DB_HIVE']
    ])
except KeyError:
    try:
        HIVE_DATABASE_URL = os.environ['DATABASE_URL']
    except KeyError:
        raise Exception('Database environment variables are not set up properly')


class InventorySupport(Enum):
    """ Whether shop uses new Etsy inventory API or not.
    Used as a parameter in tests
    """
    off = 0
    on = 1


def run_sql(db_instance, script, return_result=False, retry=0):
    "run psql <script.sql> on  db_instance (eg '00')"

    script_filename = os.path.join(DB_DIR, script + '.sql')
    try:
        open(script_filename)
    except IOError:
        print('Script file ' + script_filename + ' does not exist or not readable')
        raise

    os.environ['PGDATABASE'] = os.environ['QA_PGDATABASE_' + db_instance]
    for i in ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD']:
        os.environ[i] = os.environ['QA_' + i]

    for attempt in range(retry+1):
        tmp_file = NamedTemporaryFile()
        output_name = tmp_file.name
        returncode = call(['sh', '-c', 'psql -v ON_ERROR_STOP=1 -t --no-align --no-psqlrc -0 < ' + script_filename + ' > ' + output_name + ' 2>&1'])
        read_data = tmp_file.read()
        read_data = str(read_data, encoding="UTF-8")
        tmp_file.close()
        if returncode != 0:
            if attempt < retry:
                print("Error: DB script failed (" + DB_DIR + '/' + script + ".sql)" + "\n" + read_data + "\n")
                raise Exception("Error: DB script failed (" + DB_DIR + '/' + script + ".sql)\n" + read_data)
            else:
                continue
        if return_result:
            result = []
            for line in re.split("\0", read_data):
                if line != '':
                    # print("DB: ", line)
                    result.append(re.split("\|", line))
            return result
        return


class BaseTestClass():
    """ Contextual help test """

    def set_etsy_testcase(self, tc_name):
        etsy_emulator_interface = EtsyEmulatorInterface()

        for _ in range(5):
            try:
                etsy_emulator_interface.set_test_case(tc_name)
                break
            except EtsyEmulatorRequestError:
                etsy_emulator_interface.restart_emulator()
        else:
            # last attempt
            etsy_emulator_interface.set_test_case(tc_name)

    def restart_node(self, instance = '00'):
        if call([BIN_DIR + '/restart_node', instance]) != 0:
            raise Exception("Error: Node restart failed (" + BIN_DIR + "/restart_node)")
        sleep(2)

    def stop_all(self):
        cmd = os.path.join(BIN_DIR, 'default', 'restart-product')
        for _ in range(3):
            if call([cmd, '--kill']) == 0:
                sleep(2)
                return
        raise Exception("Error: Nodes kill failed (" + cmd + " --kill)")

    def restart_all(self):
        os.environ['QA_CURRENT_TEST'] = self.__module__ + '.py ' + self.test_id if hasattr(self, 'test_id') else self.__module__ + '.py'
        cmd = os.path.join(BIN_DIR, 'default', 'restart-product')
        for full_restart in range(5):
            for _ in range(10):
                if call([cmd]) == 0:
                    sleep(2)
                    break
            else:
                raise Exception("Error: Nodes restart failed (" + cmd + ")")
            # check if we can connect
            for connect_attempt in range(10, -1, -1):
                try:
                    r1 = requests.get(self.base_url, allow_redirects=False)
                    r2 = requests.get(self.login_url_http, allow_redirects=False)
                    if r1.status_code == 302 and r2.status_code == 302:
                        print("restart_all: servers are running", self.base_url, self.login_url_http)
                        sleep(1)
                        return
                    print("restart_all: cannot get", self.base_url, "status_code =", r1.status_code,
                          self.login_url_http, "status_code =", r2.status_code)
                except Exception as e:
                    print("restart_all: error getting", self.base_url, self.login_url_http, e.args)
                if connect_attempt > 0:
                    sleep(1)

        raise Exception('Error: restart_all failed, no attempt left')

    def setup_class(self):
        # shishito / selenium support
        self.tc = ShishitoSupport().get_test_control()
        try:
            # Set base URL - host taken from env.
            prod_host = os.environ['QA_PRODUCT_HOST'] if 'QA_PRODUCT_HOST' in os.environ else '127.0.0.1'
            prod_port = os.environ['QA_WEB_HTTPS_PORT'] if 'QA_WEB_HTTPS_PORT' in os.environ else '80'
            login_host = os.environ['QA_PRODUCT_HOST_AUTH'] if 'QA_PRODUCT_HOST_AUTH' in os.environ else prod_host
            self.base_url = 'https://' + prod_host + ':' + prod_port + '/'
            # Login URLs
            self.login_url_http  = 'http://' + login_host + ':' + os.environ['QA_AUTH_HTTP_PORT'] + '/'
            self.login_url_https = 'https://' + login_host + ':' + os.environ['QA_AUTH_HTTPS_PORT'] + '/'

            self.web_api_url_https = 'https://' + prod_host + ':' + prod_port + '/api/v1/'
        except:
            print('*** setup_class failed ***')
            raise

    def setup_method(self, method):
        self.test_id = method.__name__
        # start browser
        for attempt in range(20):
            try:
                print('*** setup_method: starting browser ***')
                self.driver = self.tc.start_browser()
                break
            except WebDriverException as e:
                print("Cannot connect to Webdriver.\n" + str(e))
                sleep(5)
        else:
            assert False, "Test could not be run due to the Webdriver error"

        self.ts = SeleniumTest(self.driver)

    def teardown_method(self, method):
        print('*** teardown_method: stopping browser ***')

        try:
            console_events = self.driver.get_log('browser')
        except Exception as e:
            print('ERROR: failed to get console events: ' + str(e))
            console_events = {}

        try:
            self.tc.stop_test(get_test_info(), debug_events=console_events)  # save screenshot in case test fails
        except Exception as e:
            print('ERROR: failed to stop the test: ' + str(e))

        try:
            self.tc.stop_browser()
        except Exception as e:
            print('ERROR: failed to stop the browser: ' + str(e))

        print('*** teardown_method: ended successfully ***')

    def close_intercom(self):
        """
          try to find intercom close button (if exists), click it
        """
        d = self.driver
        window_selectors = ['div.intercom-chat-composer', 'intercom-block']
        button_selectors = ['div.intercom-chat-dismiss-button', 'div.intercom-launcher-hovercard-close']

        # move to the IC window, so that the close button is displayed


        for selector in window_selectors:
            try:
                win = d.find_element_by_css_selector(selector)
                action = ActionChains(d)
                action.move_to_element(win)
                action.perform()
            except:
                pass

        for selector in button_selectors:
            try:
                b = d.find_element_by_css_selector(selector)
                click(b)
            except:
                pass
