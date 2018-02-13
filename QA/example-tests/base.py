# /usr/bin/env python
from shishito.runtime.shishito_support import ShishitoSupport
from shishito.ui.selenium_support import SeleniumTest
from shishito.conf.conftest import get_test_info
from subprocess import call
import requests
from time import sleep
import os

DB_DIR = os.path.dirname(__file__) + '/../sql'
BIN_DIR = os.path.dirname(__file__) + '/../bin'

class BaseTestClass():
    """ Contextual help test """

    def run_sql(self, db_instance, script):
        "run psql <script.sql> on  db_instance (eg '00')"
        for i in ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']:
            os.environ[i] = os.environ[i+'_' + db_instance]
        returncode = call(['sh', '-c', 'psql -v ON_ERROR_STOP=1 < ' + DB_DIR + '/' + script + '.sql > /dev/null'])
        if returncode != 0:
            raise Exception("Error: DB script failed (" + DB_DIR + '/' + script + ".sql)")

    def set_etsy_testcase(self, tc_name):
        url = self.etsy_url + '/set_test_id?test_id=' + tc_name
        r = requests.get(url)
        sleep(1)
        if  r.status_code != 200:
            raise Exception("Error: cannot set test case on " + url)

    def setup_class(self):
            # shishito / selenium support
        self.tc = ShishitoSupport().get_test_control()
        self.driver = self.tc.start_browser()
        self.ts = SeleniumTest(self.driver)
        self.etsy_host = os.environ['ETSY_HOST']
        self.etsy_port = os.environ['ETSY_PORT']
        self.etsy_url = 'http://' + self.etsy_host + ':' + self.etsy_port
            # etsy url - create sql script to update cfg
        with open(DB_DIR + "/tmp-etsy-location.sql", "w+") as f:
            f.write("INSERT INTO config (id, value) values ('etsy_host', '" + self.etsy_host + "');\n")
            f.write("INSERT INTO config (id, value) values ('etsy_port', '" + self.etsy_port + "');\n")
        self.run_sql(self, '00', 'clean_db_00')
        self.run_sql(self, '00', 'tmp-etsy-location')
            # restart node
        if call([BIN_DIR + '/restart_node']) != 0:
            raise Exception("Error: Node restart failed (" + BIN_DIR + "/restart_node)")
        sleep(2)
            # Set base URL - host taken from env.
        prod_host = os.environ['PRODUCT_HOST'] if 'PRODUCT_HOST' in  os.environ else '127.0.0.1'
        self.base_url = 'http://' + prod_host + '/';


    def setup_method(self, method):
            # reset DB instance 00
        self.run_sql('00', 'clean_db_00')
        self.run_sql('00', 'tmp-etsy-location')
        self.driver.get(self.base_url)



    def teardown_class(self):
        self.tc.stop_browser()
        pass

    def teardown_method(self, method):
        self.tc.stop_test(get_test_info())  # save screenshot in case test fails



